import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/** A persisted boolean (one-time hints, etc.). Storage failures read as "already set" so nothing nags forever. */
export function useFlag(key: string) {
  const [value, setValue] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(key)
      .then((v) => alive && setValue(v === '1'))
      .catch(() => alive && setValue(true));
    return () => {
      alive = false;
    };
  }, [key]);
  const set = useCallback(
    (v: boolean) => {
      setValue(v);
      (v ? AsyncStorage.setItem(key, '1') : AsyncStorage.removeItem(key)).catch(() => {});
    },
    [key],
  );
  return { ready: value !== null, value: value ?? true, set };
}
