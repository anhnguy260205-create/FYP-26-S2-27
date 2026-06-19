# Integrated Consultant / Forum Patch

This project is based on `FYP-26-S2-27-most.zip` and includes the forum fixes, expert assigned-question pages, and expert routes.

Important updates:
- Investor Expert Portfolio keeps the structure from the main branch ZIP.
- `/expert/portfolio` uses the same main-branch Expert Portfolio structure with the consultant header.
- Forum comments, created posts, likes, and saved posts are normalised so returning to the forum does not crash.
- Saved Posts tab is available beside Latest / Popular / Replies.
- Premade investor questions are available on `/expert/questions` for reply testing. Replies are saved locally for testing, and backend calls are attempted when available.
- Backend expert/forum routes and models are included.

Run:
```powershell
cd frontend
npm install
npm run build
npm run dev
```

```powershell
cd backend
uvicorn app.main:app --reload
```
