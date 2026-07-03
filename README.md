- Download MySQL workbench: https://dev.mysql.com/downloads/workbench/ 
- SQL Root Password: stock123
- run backend, run those comments in a terminal:
  + cd backend
  + uvicorn app.main:app --reload
- run frontend, open new terminal to run:
  + cd frontend
  + npm run dev
- app link: http://localhost:5173/ 
- Admin account:
  + Email: admin@gmail.com
  + Password: admin123
- Investor account:
  + Email: kim@gmail.com
  + Password: password
- Expert account:
  + Email : kimhi@gmail.com
  + Password: password
- Check api: http://127.0.0.1:8000/docs#/
- Deployment:
 Frontend:
  cd "C:/Users/kim anh/OneDrive/Documents/GitHub/FYP-26-S2-27/frontend"
  npm run build
  firebase deploy
 Backend:
  git push
  That's it — Render auto-deploys when you push to main.
