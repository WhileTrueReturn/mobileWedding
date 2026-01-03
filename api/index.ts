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

        // URL 경로에서 invitationId를 추출합니다. 
        // (예: /gildonggilsoon -> gildonggilsoon, /invitation/gildonggilsoon -> gildonggilsoon)
        const urlParts = req.url?.split('/').filter(part => part && part.trim() !== '');
        let invitationId = '';
        
        // /invitation/xxx 형식인지 확인
        if (urlParts && urlParts.length > 0) {
            if (urlParts[0] === 'invitation' && urlParts.length > 1) {
                invitationId = urlParts[1].split('?')[0];
            } else {
                invitationId = urlParts[0].split('?')[0];
            }
        }

        // 기본값 (메인 페이지용)
        let title = '셀프 모바일 청첩장 당일제작, 인스타 스토리 청첩장';
        let description = '인스타그램 스토리 형식의 감성적인 모바일 청첩장을 무료로 제작하세요. 사진 업로드만으로 당일 제작 가능한 디지털 청첩장 서비스입니다.';
        let imageUrl = 'https://www.mobilewedding.kr/mainPage0.png';
        let url = 'https://www.mobilewedding.kr';

        // 청첩장 ID가 있고, create/admin 페이지가 아닌 경우
        if (invitationId && invitationId !== 'create' && invitationId !== 'admin' && invitationId.trim() !== '') {
            const docRef = doc(db, 'invitations', invitationId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                title = `${data.groomName} ❤️ ${data.brideName} 결혼합니다`;
                description = `${data.weddingDate} ${data.weddingTime ? data.weddingTime + ', ' : ''}${data.weddingLocation}${data.weddingHall ? ' ' + data.weddingHall : ''}`;
                imageUrl = data.imageUrls?.[0] || 'https://www.mobilewedding.kr/mainPage0.png';
                url = `https://www.mobilewedding.kr/invitation/${invitationId}`;
            }
        }

        // index.html의 OG 태그들을 동적으로 교체합니다.
        htmlData = htmlData
            .replace(/__OG_TITLE__/g, title)
            .replace(/__OG_DESCRIPTION__/g, description)
            .replace(/__OG_IMAGE__/g, imageUrl)
            .replace(/__OG_URL__/g, url);
        
        // 최종적으로 수정된 HTML을 응답으로 보냅니다.
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(htmlData);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating preview');
    }
};