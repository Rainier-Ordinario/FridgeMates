#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#ifdef _WIN32
#include <winsock2.h>
#pragma comment(lib, "Ws2_32.lib")
typedef SOCKET socket_t;
#define CLOSE_SOCKET closesocket
#else
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>
typedef int socket_t;
#define INVALID_SOCKET (-1)
#define SOCKET_ERROR (-1)
#define CLOSE_SOCKET close
#endif

#define PORT 8000
#define REQUEST_SIZE 16384
#define MAX_ITEMS 64

typedef struct {
    char name[64];
    char category[32];
    char expiry_date[11];
    int quantity;
} FoodItem;

static FoodItem inventory[MAX_ITEMS];
static size_t inventory_count;

static int json_string(const char *json, const char *key, char *out, size_t out_size) {
    char needle[64];
    const char *start;
    const char *end;
    snprintf(needle, sizeof needle, "\"%s\"", key);
    start = strstr(json, needle);
    if (!start || !(start = strchr(start + strlen(needle), ':')) || !(start = strchr(start, '"'))) return 0;
    end = strchr(start + 1, '"');
    if (!end) return 0;
    size_t length = (size_t)(end - start - 1);
    if (length >= out_size) length = out_size - 1;
    memcpy(out, start + 1, length);
    out[length] = '\0';
    return 1;
}

static void expiry_after_days(char *out, size_t out_size, int days) {
    time_t now = time(NULL) + (time_t)days * 24 * 60 * 60;
    struct tm *day = localtime(&now);
    strftime(out, out_size, "%Y-%m-%d", day);
}

static int shelf_life(const char *category) {
    if (strcmp(category, "milk") == 0) return 7;
    if (strcmp(category, "eggs") == 0) return 28;
    if (strcmp(category, "chicken") == 0) return 3;
    if (strcmp(category, "beef") == 0) return 3;
    if (strcmp(category, "fish") == 0) return 2;
    if (strcmp(category, "vegetables") == 0) return 7;
    if (strcmp(category, "fruit") == 0) return 7;
    return 5;
}

static void add_items_from_snapshot(const char *body) {
    const char *cursor = body;
    while (inventory_count < MAX_ITEMS && (cursor = strstr(cursor, "\"name\""))) {
        FoodItem *item = &inventory[inventory_count];
        memset(item, 0, sizeof *item);
        json_string(cursor, "name", item->name, sizeof item->name);
        if (!json_string(cursor, "category", item->category, sizeof item->category)) strcpy(item->category, "leftovers");
        if (!json_string(cursor, "expiry_date", item->expiry_date, sizeof item->expiry_date)) {
            expiry_after_days(item->expiry_date, sizeof item->expiry_date, shelf_life(item->category));
        }
        item->quantity = 1;
        inventory_count++;
        cursor += 6;
    }
}

static void send_text(socket_t client, int status, const char *body) {
    char response[REQUEST_SIZE];
    int length = snprintf(response, sizeof response,
        "HTTP/1.1 %d\r\nContent-Type: application/json\r\nContent-Length: %zu\r\nConnection: close\r\n\r\n%s",
        status, strlen(body), body);
    send(client, response, length, 0);
}

static void handle_request(socket_t client, const char *request) {
    char method[8] = {0};
    char path[128] = {0};
    char body[REQUEST_SIZE] = {0};
    const char *body_start = strstr(request, "\r\n\r\n");
    sscanf(request, "%7s %127s", method, path);
    if (body_start) strncpy(body, body_start + 4, sizeof body - 1);

    if (strcmp(method, "GET") == 0 && strcmp(path, "/health") == 0) {
        return send_text(client, 200, "{\"status\":\"ok\"}");
    }

    if (strcmp(method, "POST") == 0 && strstr(path, "/snapshots") != NULL) {
        add_items_from_snapshot(body);
        return send_text(client, 201, "{\"status\":\"snapshot stored\"}");
    }

    if (strcmp(method, "GET") == 0 && strstr(path, "/inventory") != NULL) {
        char response[REQUEST_SIZE] = "{\"items\":[";
        for (size_t i = 0; i < inventory_count; i++) {
            char item[256];
            const char *separator = "";
            if (i > 0) separator = ",";
            snprintf(item, sizeof item, "%s{\"name\":\"%s\",\"category\":\"%s\",\"expiry_date\":\"%s\"}",
                separator, inventory[i].name, inventory[i].category, inventory[i].expiry_date);
            strncat(response, item, sizeof response - strlen(response) - 1);
        }
        strncat(response, "]}", sizeof response - strlen(response) - 1);
        return send_text(client, 200, response);
    }

    if (strcmp(method, "GET") == 0 && strstr(path, "/notifications") != NULL) {
        return send_text(client, 200, "{\"notifications\":[],\"note\":\"expiry notification logic is next\"}");
    }

    if (strcmp(method, "GET") == 0 && strstr(path, "recommendations") != NULL) {
        return send_text(client, 200, "{\"recommendations\":[\"Use ingredients that expire soon\"]}");
    }

    send_text(client, 404, "{\"error\":\"route not found\"}");
}

int main(void) {
#ifdef _WIN32
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) return 1;
#endif
    socket_t server = socket(AF_INET, SOCK_STREAM, 0);
    if (server == INVALID_SOCKET) return 1;

    struct sockaddr_in address = {0};
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    address.sin_port = htons(PORT);
    if (bind(server, (struct sockaddr *)&address, sizeof address) == SOCKET_ERROR || listen(server, 8) == SOCKET_ERROR) return 1;

    puts("FridgeMates API listening on http://127.0.0.1:8000");
    for (;;) {
        socket_t client = accept(server, NULL, NULL);
        if (client == INVALID_SOCKET) continue;
        char request[REQUEST_SIZE] = {0};
        int received = recv(client, request, sizeof request - 1, 0);
        if (received > 0) handle_request(client, request);
        CLOSE_SOCKET(client);
    }
}
