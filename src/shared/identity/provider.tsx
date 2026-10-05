import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { IDENTITY_KEY, readIdentity, type Identity } from './store';
const Context = createContext<Identity | null>(null);
export function IdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState(readIdentity);
  useEffect(() => {
    const sync = () => setIdentity(readIdentity());
    const storage = (event: StorageEvent) => {
      if (event.key === IDENTITY_KEY) sync();
    };
    window.addEventListener('storage', storage);
    window.addEventListener('goalday:identity', sync);
    return () => {
      window.removeEventListener('storage', storage);
      window.removeEventListener('goalday:identity', sync);
    };
  }, []);
  return <Context.Provider value={identity}>{children}</Context.Provider>;
}
export function useIdentity() {
  const value = useContext(Context);
  if (!value) throw new Error('IdentityProvider is required');
  return value;
}
