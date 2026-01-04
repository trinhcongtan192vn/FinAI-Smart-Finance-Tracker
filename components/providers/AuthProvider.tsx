import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { DataContext } from '../../types';
import i18n from '../../lib/i18n';
import { setAppCurrency } from '../../lib/utils';

interface AuthContextType {
    user: User | null;
    activeContext: DataContext | null;
    loading: boolean;
    isOnboarding: boolean;
    privacyMode: boolean;
    togglePrivacy: () => Promise<void>;
    setIsOnboarding: (value: boolean) => void;
    setActiveContext: (context: DataContext | null) => void;
    passcodeData: { enabled: boolean; code: string } | null;
    userData: any | null; // Raw user data for other hooks
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Global state for Engagement Triggers to avoid circular deps or complex passing, 
// though could also be part of the context or a separate one. 
// For now, we will expose the necessary data via context.

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeContext, setActiveContext] = useState<DataContext | null>(null);
    const [isOnboarding, setIsOnboarding] = useState(false);
    const [privacyMode, setPrivacyMode] = useState(false);
    const [passcodeData, setPasscodeData] = useState<{ enabled: boolean; code: string } | null>(null);
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        let unsubDoc: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            console.log("[AuthProvider] Auth State Changed:", currentUser?.email);
            setUser(currentUser);

            if (currentUser) {
                unsubDoc = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserData(data); // Store raw data for other consumers

                        setIsOnboarding(data.onboarded === false);
                        setPrivacyMode(data.privacyMode === true);
                        setPasscodeData({
                            enabled: data.passcodeEnabled === true,
                            code: data.passcode || ''
                        });

                        if (data.language && i18n.language !== data.language) {
                            i18n.changeLanguage(data.language);
                        }
                        if (data.currency) setAppCurrency(data.currency);

                        setActiveContext({
                            uid: currentUser.uid,
                            displayName: data.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Personal',
                            email: currentUser.email || '',
                            photoURL: data.photoURL || currentUser.photoURL || '',
                            permission: 'owner',
                            tutorialState: data.tutorialState,
                            financialProfile: data.financialProfile
                        });
                    } else {
                        setIsOnboarding(true);
                        setActiveContext({
                            uid: currentUser.uid,
                            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Personal',
                            email: currentUser.email || '',
                            photoURL: currentUser.photoURL || '',
                            permission: 'owner'
                        });
                        setUserData(null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.warn("User Profile Snapshot Error:", error);
                    setLoading(false);
                });
            } else {
                setLoading(false);
                setActiveContext(null);
                setUserData(null);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubDoc) unsubDoc();
        };
    }, []);

    const togglePrivacy = async () => {
        // Implementation moved here or kept in component? 
        // Better to keep simple state toggle here and maybe API call, 
        // but imports need `updateDoc`.
        // We'll expose the function.
        if (!user) return;
        // We will optimistic update local state if needed, but the snapshot will handle it.
        // However, to make it responsive, we can call the API.
        // Note: We need to import updateDoc/doc/db. They are imported.
        const { updateDoc, doc } = await import('firebase/firestore');
        // Dynamic import or static? Static is fine.
        try { await updateDoc(doc(db, 'users', user.uid), { privacyMode: !privacyMode }); } catch (e) { console.error(e); }
    };

    return (
        <AuthContext.Provider value={{
            user,
            activeContext,
            loading,
            isOnboarding,
            privacyMode,
            togglePrivacy,
            setIsOnboarding,
            setActiveContext,
            passcodeData,
            userData
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
