# 🚀 Green Power and Construction — GitHub & Vercel Deployment Guide

এই নির্দেশিকাটি অনুসরণ করে আপনি আপনার প্রজেক্টটি খুব সহজেই **GitHub**-এ পুশ করতে পারবেন এবং **Vercel**-এ বিনামূল্যে হোস্ট করে রিয়েল-টাইম ক্লাউড ডাটা সিঙ্ক (Firebase Cloud Sync) চালু রাখতে পারবেন।

---

## 📌 ১. প্রজেক্ট ফাইলসমূহ GitHub-এ আপলোড করার উপায়

১. আপনার কম্পিউটারে **Git** ইনস্টল করা না থাকলে ইনস্টল করে নিন।
২. আপনার প্রজেক্ট ফোল্ডারে টার্মিনাল / Command Prompt ওপেন করে নিচের কমান্ডগুলো চালান:

```bash
# ১. গিট ইনিশিয়ালাইজ করুন
git init

# ২. সকল ফাইল যোগ করুন
git add .

# ৩. কমিক মেসেজ দিন
git commit -m "Initial commit for Green Power and Construction App"

# ৪. মেইন ব্রাঞ্চ সিলেক্ট করুন
git branch -M main

# ৫. আপনার GitHub রেপোজিটরি লিংক যুক্ত করুন (আপনার গিটহাব লিংক দিয়ে রিপ্লেস করুন)
git remote add origin https://github.com/YOUR_USERNAME/green-power-construction.git

# ৬. গিটহাবে পুশ করুন
git push -u origin main
```

---

## 🌐 ২. Vercel-এ প্রজেক্ট হোস্ট করার সহজ নিয়ম

১. **[Vercel.com](https://vercel.com)**-এ যান এবং আপনার GitHub অ্যাকাউন্ট দিয়ে লগইন করুন।
২. **"Add New"** > **"Project"** বাটনে ক্লিক করুন।
৩. আপনার GitHub এর `green-power-construction` রেপোজিটরি নির্বাচন করে **"Import"** চাপুন।
৪. **Framework Preset:** নির্বাচন করুন **Vite**।
৫. **Environment Variables** অপশনটি চালু করে নিচের কি (Key) ও ভ্যালু (Value) গুলো যুক্ত করুন:

| Environment Variable Key | Value |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY` | `AIzaSyCoJma63ExeyVbqwTafN1sBnQJvToDnPV0` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `excellent-dispatcher-ht3g1.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `excellent-dispatcher-ht3g1` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `excellent-dispatcher-ht3g1.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `326676867985` |
| `VITE_FIREBASE_APP_ID` | `1:326676867985:web:67ccb025b4e4033b4d4830` |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | `ai-studio-a3fcbc01-393d-4f7e-94f9-df00a43bcb37` |

৬. **"Deploy"** বাটনে ক্লিক করুন! ১ মিনিটের মধ্যেই আপনার লাইভ ওয়েবসাইট লিংক তৈরি হয়ে যাবে।

---

## ⚡ ৩. ফায়ারবেস রিয়েল-টাইম ক্লাউড ডাটা সিঙ্ক (Firebase Cloud Sync)

- আপনার অ্যাপটি **Firebase Cloud Firestore** এর সাথে সরাসরি যুক্ত।
- আপনি সাইটে নতুন হাজিরা, আয়, খরচ, নতুন কর্মী বা সেটিংসে লোগো/ছবি পরিবর্তন করলে তা সাথে সাথে ক্লাউড ডাটাবেজে সেভ ও সিঙ্ক হয়ে যাবে।
- যেকোনো ডিভাইস বা মোবাইল থেকে ওয়েবসাইটটি ওপেন করলেই সকল তথ্য আপডেট দেখতে পাবেন।
