- Clone Repository:
  + git clone "https://github.com/anhnguy260205-create/FYP-26-S2-27"
- Please install:
  + Python
  + Node.js and npm
  + MySQL Server
  + MySQL Workbench
- Download MySQL workbench: https://dev.mysql.com/downloads/workbench/ 
- SQL Root Password: stock123
- run backend, run those comments in a terminal:
  + cd backend
  + pip install -r requirements.txt
  + uvicorn app.main:app --reload
- run frontend, open new terminal to run:
  + cd frontend
  + npm install
  + npm run dev
- app link: http://localhost:5173/
- Operation Admin account:
  + Email: fyphr123@gmail.com
  + Password: password
- Finance Admin account:
  + Email: fyphd3009@gmail.com
  + Password: password123
- Basic Investor account:
  + Email: kim@gmail.com
  + Password: password
- Premium Investor account:
  + Email: himodilesg242@gmail.com
  + Password: password
- Expert account:
  + Email : anhnguy.260205@gmail.com
  + Password: Limyuk.2005
- Check api: http://127.0.0.1:8000/docs#/
- Deployment:
 Frontend:
  cd "C:/Users/kim anh/OneDrive/Documents/GitHub/FYP-26-S2-27/frontend"
  npm run build
  firebase deploy
 Backend:
  git push
  That's it — Railway auto-deploys when you push to main.
