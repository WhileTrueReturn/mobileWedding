import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default async (req: VercelRequest, res: VercelResponse) => {
    try {
        const filePath = path.resolve('./dist/index.html');
        let htmlData = fs.readFileSync(filePath, 'utf8');

        const invitationId = req.url?.split('/')[1].split('?')[0];

        // ★★★★★ 변경점 1: 미리보기 정보를 담을 변수에 '기본값'을 먼저 설정합니다. ★★★★★
        let ogTitle = "감성 인스타 스토리 모바일 청첩장";
        let ogDescription = "사진을 넘길 때마다 펼쳐지는 두 분만의 특별한 이야기. 지금 확인해보세요!";
        // public 폴더에 넣어둘 대표 이미지 경로입니다. (파일 이름은 원하시는 대로 변경 가능)
        let ogImage = "https://www.mobilewedding.kr/mainPage1.png"; 

        // ★★★★★ 변경점 2: ID가 있을 때만 아래 로직을 실행하여 기본값을 덮어씁니다. ★★★★★
        if (invitationId && invitationId !== 'create' && invitationId !== 'favicon.ico' && invitationId !== 'mainPage1.png' && invitationId !== 'mainPage2.png' && invitationId !== 'mainPage3.png') {
            const docRef = doc(db, 'invitations', invitationId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                // Firestore에서 가져온 정보로 변수 값을 교체합니다.
                ogTitle = `${data.groomName} ♥ ${data.brideName}의 결혼식에 초대합니다.`;
                ogDescription = `${data.weddingDate} ${data.weddingTime}, ${data.weddingLocation}`;
                ogImage = data.imageUrls?.[0] || ogImage;
            }
        }
        
        // 최종적으로 결정된 값으로 HTML의 자리 표시자를 교체합니다.
        htmlData = htmlData
            .replace(/__OG_TITLE__/g, ogTitle)
            .replace(/__OG_DESCRIPTION__/g, ogDescription)
            .replace(/__OG_IMAGE__/g, ogImage);
        
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(htmlData);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating preview');
    }
};