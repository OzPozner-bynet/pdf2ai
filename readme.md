Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
winget install -e --id OpenJS.NodeJS -h
npm install
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.cert -days 365 -nodes -subj "/CN=localhost"
npx pm2 start server.js




curl -X POST  http://localhost:8080/api/extract-pdf-data  -F "pdf=@C:\tmp\s.pdf"  -o c:\tmp\output.json