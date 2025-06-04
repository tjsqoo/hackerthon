# server/Dockerfile

# Node.js 20 LTS 버전을 기반 이미지로 사용
FROM node:20-alpine

# 작업 디렉토리를 /app으로 설정
WORKDIR /app

# package.json과 package-lock.json을 복사하여 종속성을 먼저 설치
COPY package*.json ./

# 종속성 설치
RUN npm install

# 모든 소스 코드를 작업 디렉토리로 복사
COPY . .

# 4000번 포트 노출
EXPOSE 4000

# 애플리케이션 실행 명령어
CMD ["npm", "start"]
