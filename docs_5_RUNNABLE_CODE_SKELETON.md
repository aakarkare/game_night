# Executable Code Blueprint & Skeleton Setup

This document provides runnable code components for your Party Game Hub project.

---

## 1. Firebase Initialization (`src/lib/firebase.ts`)

```typescript
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

export { app, db, rtdb };

```

---

## 2. Static Jeopardy Dataset (`public/data/jeopardy.json`)

```json
[
  {
    "category": "Pop Culture",
    "clues": [
      { "id": "pc-100", "value": 100, "question": "This famous reality show features contestants trying to survive on an island.", "answer": "What is Survivor?", "isRevealed": false },
      { "id": "pc-200", "value": 200, "question": "Which artist released the hit album 'Midnights' in 2022?", "answer": "Who is Taylor Swift?", "isRevealed": false },
      { "id": "pc-300", "value": 300, "question": "This sci-fi series features a character known simply as Eleven.", "answer": "What is Stranger Things?", "isRevealed": false },
      { "id": "pc-400", "value": 400, "question": "What is the highest-grossing film of all time worldwide?", "answer": "What is Avatar?", "isRevealed": false },
      { "id": "pc-500", "value": 500, "question": "Which superhero team consists of Iron Man, Thor, Hulk, and Captain America?", "answer": "Who are The Avengers?", "isRevealed": false }
    ]
  },
  {
    "category": "World Geography",
    "clues": [
      { "id": "geo-100", "value": 100, "question": "What is the capital city of France?", "answer": "What is Paris?", "isRevealed": false },
      { "id": "geo-200", "value": 200, "question": "Which river is considered the longest in the world?", "answer": "What is the Nile River?", "isRevealed": false },
      { "id": "geo-300", "value": 300, "question": "Which country has the largest land area in the world?", "answer": "What is Russia?", "isRevealed": false },
      { "id": "geo-400", "value": 400, "question": "What is the smallest country in the world by population and area?", "answer": "What is Vatican City?", "isRevealed": false },
      { "id": "geo-500", "value": 500, "question": "Which mountain range separates Europe from Asia?", "answer": "What are the Ural Mountains?", "isRevealed": false }
    ]
  },
  {
    "category": "Tech & Web",
    "clues": [
      { "id": "tech-100", "value": 100, "question": "What language family powers standard modern web styling?", "answer": "What is CSS?", "isRevealed": false },
      { "id": "tech-200", "value": 200, "question": "Which operating system kernel is represented by a penguin mascot?", "answer": "What is Linux?", "isRevealed": false },
      { "id": "tech-300", "value": 300, "question": "What version control system was created by Linus Torvalds in 2005?", "answer": "What is Git?", "isRevealed": false },
      { "id": "tech-400", "value": 400, "question": "What company originally created and open-sourced React?", "answer": "What is Meta (Facebook)?", "isRevealed": false },
      { "id": "tech-500", "value": 500, "question": "What open-source JavaScript runtime lets developers run JS on servers?", "answer": "What is Node.js?", "isRevealed": false }
    ]
  }
]

```

---

## 3. Google Apps Script (`google-forms-webhook.js`)

Copy this script into your Google Form's script editor (**Extensions > Apps Script**).

```javascript
// Attach this script to your Google Form (Extensions > Apps Script)
// Set up a Trigger: Head to Triggers > Add Trigger > Select Event Type: "On form submit"

function onFormSubmit(e) {
  var webhookUrl = "https://your-vercel-domain.vercel.app/api/form-webhook"; // Update with deployment URL
  
  var itemResponses = e.response.getItemResponses();
  var payloadData = {
    respondentEmail: e.response.getRespondentEmail() || "Anonymous",
    timestamp: e.response.getTimestamp(),
    answers: {}
  };

  for (var i = 0; i < itemResponses.length; i++) {
    var itemResponse = itemResponses[i];
    payloadData.answers[itemResponse.getItem().getTitle()] = itemResponse.getResponse();
  }

  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payloadData)
  };

  try {
    UrlFetchApp.fetch(webhookUrl, options);
  } catch (err) {
    Logger.log("Failed to deliver webhook: " + err.toString());
  }
}

```

---

## 4. Next.js Webhook Route Handler (`src/app/api/form-webhook/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { respondentEmail, timestamp, answers } = body;

    if (!answers) {
      return NextResponse.json({ error: "Invalid form payload" }, { status: 400 });
    }

    // Write submission to Firestore survey_responses collection
    await addDoc(collection(db, "survey_responses"), {
      respondentEmail: respondentEmail || "Anonymous",
      submittedAt: timestamp || new Date().toISOString(),
      receivedAt: serverTimestamp(),
      answers: answers,
    });

    return NextResponse.json({ success: true, message: "Webhook logged successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error processing form webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

```

---

## 5. Live Questionnaire Page (`src/app/questionnaire/page.tsx`)

```tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

interface SurveyResponse {
  id: string;
  respondentEmail: string;
  submittedAt: string;
  answers: Record<string, any>;
}

export default function QuestionnairePage() {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);

  useEffect(() => {
    const q = query(collection(db, "survey_responses"), orderBy("receivedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SurveyResponse[];
      setResponses(docs);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <header className="max-w-6xl mx-auto mb-10 flex justify-between items-center border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-emerald-400">Ongoing Competition Progress</h1>
          <p className="text-slate-400 mt-1">Live status submissions tracked from guest updates</p>
        </div>
        <div className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-lg text-sm font-semibold">
          Total Submissions: {responses.length}
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid gap-6">
        {responses.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-slate-800">
            <p className="text-slate-400 text-lg">No progress updates submitted yet. Fill out the form to post progress!</p>
          </div>
        ) : (
          responses.map((item) => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg hover:border-slate-700 transition">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/60">
                <span className="font-semibold text-emerald-400">{item.respondentEmail}</span>
                <span className="text-xs text-slate-500">{new Date(item.submittedAt).toLocaleTimeString()}</span>
              </div>
              <div className="grid gap-3">
                {Object.entries(item.answers || {}).map(([question, answer]) => (
                  <div key={question} className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/40">
                    <span className="text-xs font-semibold text-slate-400 block mb-1 uppercase tracking-wider">{question}</span>
                    <span className="text-slate-200 text-sm font-medium">{String(answer)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}

```
