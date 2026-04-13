# CivicImpact: Federated Civic Infrastructure 🇮🇳

**CivicImpact** is a production-grade Digital Civic Infrastructure designed to solve the **"Civic Data Black Hole."** By replacing unverified social media "likes" with a **Verified Proof-of-Impact Protocol**, we bridge the gap between grassroots action and official government recognition.

---

## 🚀 The Core Concept
Traditional civic participation is fragmented and invisible. **CivicImpact** implements a **Federated Route System** that allows local authorities (Official Hubs) to verify and reward citizen contributions in real-time, creating a data-driven **"Social Resume"** for every Indian.

### **Key Innovations:**
* **Competitive Governance:** Real-time leaderboards that trigger a **"Race to the Top"** between rival districts and administrative bodies.
* **Cognitive Audit Layer:** Integrated LLM logic (**Gemini/Llama**) that semantically verifies civic claims and filters fraudulent data.
* **The Civic Economy:** A 5-tier gamified progression system (**Newcomer → Legend**) that converts verified physical impact into a recognized civic credential.

---

## 🏗️ System Architecture

1.  **Input:** User captures a **"Snapshot"** (Geotagged Metadata + Before/After photos).
2.  **Processing:** The **Cognitive Layer** performs semantic delta analysis to verify the unique object ID and GPS authenticity.
3.  **Verification:** The **Official Hub** (Municipality/NGO) receives a **"Proof of Impact"** packet for a final digital handshake.
4.  **Propagation:** Upon approval, **WebSockets** trigger an atomic update to the user's **Social Resume** and the **District Leaderboard**.

---

## 🛠️ Technical Stack

### **Frontend (The User Layer)**
* **Framework:** `Next.js 16.2` (App Router) for high-performance SSR and SEO.
* **State Management:** `Zustand` for atomic, non-blocking state updates.
* **PWA:** Native-app experience with `Service Workers` for offline persistence in low-connectivity zones.
* **Animation:** `Framer Motion` & `Tailwind CSS` for a high-fidelity, responsive UI.

### **Backend (The Logic Engine)**
* **Runtime:** `FastAPI` (Python) utilizing `ASGI` for high-throughput, asynchronous I/O.
* **Real-time:** `WebSockets` for instant point propagation and live Hub coordination.
* **Security:** Stateless `JWT (RS256)` with `Argon2` hashing and `SlowAPI` rate-limiting.

### **Intelligence & Data**
* **LLM Orchestration:** `LangChain` + `Google Gemini` for semantic verification and automated auditing.
* **RAG Pipeline:** Contextual retrieval of localized government mandates for grounded AI assistance.
* **Database:** `MongoDB` + `Beanie ODM` with `Geospatial 2dsphere indexing` for radius-based discovery.
* **Media:** `Cloudinary CDN` for asynchronous ingestion and optimized "Before & After" evidence storage.

---

## 📱 Features

* **Federated Hubs:** Three-tier hierarchy (**Normal → Official → Community Network**).
* **Snapshot Protocol:** High-speed verification logic avoiding long-form video overhead.
* **Anti-Farming Logic:** **GPS Metadata locking** and unique instance fingerprinting to prevent incentive manipulation.
* **CivicAssistant:** An AI-powered **RAG chatbot** providing localized governance guidance and motivational coaching.

---

> **Mission:** Moving India from a culture of *Complaining* to a culture of *Contribution*.
> # WEB LINK : https://impacthub-dnjr.vercel.app/





### **Setup & Installation**

#### **Backend Infrastructure**
```bash
# Navigate to the backend directory
cd backend

# Initialize the Python Virtual Environment
python -m venv venv

# Activate the environment (Windows: venv\Scripts\activate)
source venv/bin/activate

# Install high-performance asynchronous dependencies
pip install -r requirements.txt

# Launch the FastAPI server with hot-reload enabled
uvicorn main:app --reload
