Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
winget install -e --id OpenJS.NodeJS -h
npm installn
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.cert -days 365 -nodes -subj "/CN=localhost"
npx gm2 start server.js