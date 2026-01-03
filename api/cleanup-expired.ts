import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getStorage, ref, listAll, deleteObject } from 'firebase/storage';

// Firebase 앱이 이미 초기화되었는지 확인하여 중복 초기화를 방지합니다.
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

export default async (req: VercelRequest, res: VercelResponse) => {
    // API 키로 보호 (환경변수에 설정)
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    if (apiKey !== process.env.CLEANUP_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const now = Date.now();
        const invitationsRef = collection(db, 'invitations');
        
        // expiresAt이 현재 시간보다 이전인 문서들을 찾습니다
        const q = query(invitationsRef, where('expiresAt', '<=', now));
        const querySnapshot = await getDocs(q);

        const deletedIds: string[] = [];
        const errors: string[] = [];

        for (const docSnapshot of querySnapshot.docs) {
            const invitationId = docSnapshot.id;
            
            try {
                // 1. Storage에서 이미지 삭제
                const storageRef = ref(storage, `invitations/${invitationId}`);
                const listResult = await listAll(storageRef);
                
                await Promise.all(
                    listResult.items.map(itemRef => deleteObject(itemRef))
                );

                // 2. Firestore 문서 삭제
                await deleteDoc(doc(db, 'invitations', invitationId));
                
                deletedIds.push(invitationId);
                console.log(`Deleted invitation: ${invitationId}`);
            } catch (error) {
                console.error(`Error deleting invitation ${invitationId}:`, error);
                errors.push(`${invitationId}: ${error}`);
            }
        }

        res.status(200).json({
            success: true,
            deletedCount: deletedIds.length,
            deletedIds,
            errors: errors.length > 0 ? errors : undefined,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
