import type { GhostRequest, GhostResponse } from '../types';

export function mockGhostResponse(req: GhostRequest): GhostResponse {
  const { name, characterName } = req.item;
  const options = [
    `Here lies ${name}. Bought with good intentions.`,
    `${characterName} (${name}). Said "eat me" 14 times. Was ignored 14 times.`,
    `In loving memory of ${name}. The back of the fridge is a cold, cold place.`,
  ];
  return { epitaph: options[name.length % options.length] };
}
