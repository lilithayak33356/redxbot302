FROM node:20-alpine

# Install system dependencies (including ffmpeg)
RUN apk add --no-cache \
    git \
    ffmpeg \
    imagemagick \
    libwebp \
    libwebp-tools

WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Remove problematic dependencies that don't exist on npm
RUN node -e "const fs = require('fs'); \
    const pkg = JSON.parse(fs.readFileSync('package.json')); \
    const deps = ['discard-api', 'pinterest-downloader']; \
    let changed = false; \
    deps.forEach(dep => { \
        if (pkg.dependencies && pkg.dependencies[dep]) { \
            delete pkg.dependencies[dep]; \
            changed = true; \
            console.log('Removed dependency:', dep); \
        } \
        if (pkg.devDependencies && pkg.devDependencies[dep]) { \
            delete pkg.devDependencies[dep]; \
            changed = true; \
            console.log('Removed devDependency:', dep); \
        } \
    }); \
    if (changed) fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));"

# Set environment variables for sharp (if needed)
ENV npm_config_platform=linuxmusl
ENV npm_config_arch=x64

# Install dependencies
RUN npm install --force --loglevel=error

# Copy the rest of the application source code
COPY . .

EXPOSE 3000

# Start the bot
CMD ["npm", "start"]
