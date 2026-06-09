import React, { createContext, useContext, useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../screens/LoadingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MapScreen from '../screens/MapScreen';
import PairingScreen from '../screens/PairingScreen';
import AccountScreen from '../screens/AccountScreen';
import * as pairingService from '../services/pairingService';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Map: undefined;
  Account: undefined;
};

type PairingGateContextType = {
  onLinked: () => void;
  onUnlinked: () => void;
};

export const PairingGateContext = createContext<PairingGateContextType>({
  onLinked: () => {},
  onUnlinked: () => {},
});

export function usePairingGate() {
  return useContext(PairingGateContext);
}

export type LobbyStackParamList = {
  Pairing: undefined;
  Account: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const LinkedStack = createNativeStackNavigator<AppStackParamList>();
const UnlinkedStack = createNativeStackNavigator<LobbyStackParamList>();

type Phase = 'loading' | 'unauthenticated' | 'unlinked' | 'linked';

export default function RootNavigator() {
  const { authState } = useAuth();
  const [phase, setPhase] = useState<Phase>('loading');

  useEffect(() => {
    if (authState.status === 'loading') {
      setPhase('loading');
      return;
    }
    if (authState.status === 'unauthenticated') {
      setPhase('unauthenticated');
      return;
    }
    pairingService
      .getStatus()
      .then(s => setPhase(s.status === 'linked' ? 'linked' : 'unlinked'))
      .catch(() => setPhase('unlinked'));
  }, [authState.status]);

  if (phase === 'loading') return <LoadingScreen />;

  if (phase === 'unauthenticated') {
    return (
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="Register" component={RegisterScreen} />
      </AuthStack.Navigator>
    );
  }

  if (phase === 'unlinked') {
    return (
      <PairingGateContext.Provider value={{ onLinked: () => setPhase('linked'), onUnlinked: () => {} }}>
        <UnlinkedStack.Navigator screenOptions={{ headerShown: false }}>
          <UnlinkedStack.Screen name="Pairing" component={PairingScreen} />
          <UnlinkedStack.Screen name="Account" component={AccountScreen} />
        </UnlinkedStack.Navigator>
      </PairingGateContext.Provider>
    );
  }

  return (
    <PairingGateContext.Provider value={{ onLinked: () => {}, onUnlinked: () => setPhase('unlinked') }}>
      <LinkedStack.Navigator screenOptions={{ headerShown: false }}>
        <LinkedStack.Screen name="Map" component={MapScreen} />
        <LinkedStack.Screen name="Account" component={AccountScreen} />
      </LinkedStack.Navigator>
    </PairingGateContext.Provider>
  );
}
