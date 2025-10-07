FROM node:20-alpine

WORKDIR /app

# ติดตั้ง dependencies ที่จำเป็น
RUN apk add --no-cache bash openssl netcat-openbsd libc6-compat

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# สร้าง non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# เปลี่ยน ownership ของไฟล์ทั้งหมดให้กับ nextjs user
RUN chown -R nextjs:nodejs /app

# เปลี่ยนเป็น nextjs user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start the application
CMD ["node", "server.js"]