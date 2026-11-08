import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'fridgemates.welcomed.v1';

/**
 * First-run flag. Storage failures count as "welcomed" so the app never blocks on it.
 * TODO(ios-logic): shares AsyncStorage with the fridge store; keep the key stable.
 */
export function useFirstRun() {
  const [welcomed, setWelcomed] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((v) => alive && setWelcomed(v === '1'))
      .catch(() => alive && setWelcomed(true));
    return () => {
      alive = false;
    };
  }, []);

  const markWelcomed = useCallback(() => {
    setWelcomed(true);
    AsyncStorage.setItem(KEY, '1').catch(() => {});
  }, []);

  const resetWelcome = useCallback(() => {
    setWelcomed(false);
    AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  return { ready: welcomed !== null, welcomed: welcomed ?? true, markWelcomed, resetWelcome };
}
