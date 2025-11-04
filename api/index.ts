import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

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

export default async (req: VercelRequest, res: VercelResponse) => {
    try {
        const filePath = path.resolve('./dist/index.html');
        let htmlData = fs.readFileSync(filePath, 'utf8');

        // URL 경로에서 invitationId를 추출합니다. (예: /gildonggilsoon -> gildonggilsoon)
        const invitationId = req.url?.split('/')[1].split('?')[0];

        if (invitationId && invitationId !== 'create') {
            const docRef = doc(db, 'invitations', invitationId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const title = `${data.groomName} ♥ ${data.brideName}의 결혼식에 초대합니다.`;
                const description = `${data.weddingDate} ${data.weddingTime}, ${data.weddingLocation}`;
                const imageUrl = data.imageUrls?.[0] || 'https://www.mobilewedding.kr/default-image.jpg'; // 기본 이미지 경로

                // index.html의 OG 태그들을 동적으로 교체합니다.
                htmlData = htmlData
                    .replace(/__OG_TITLE__/g, title)
                    .replace(/__OG_DESCRIPTION__/g, description)
                    .replace(/__OG_IMAGE__/g, imageUrl);
            }
        }
        
        // 최종적으로 수정된 HTML을 응답으로 보냅니다.
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(htmlData);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating preview');
    }
};