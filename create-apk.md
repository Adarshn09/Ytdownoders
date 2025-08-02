# How to Create APK for Your Phone

## Method 1: Using Your Computer

1. **Install Android Studio** on your computer:
   - Download from: https://developer.android.com/studio
   - Follow the installation guide

2. **Open the project:**
   ```bash
   npx cap open android
   ```

3. **Connect your phone:**
   - Enable Developer Options on your Android phone
   - Enable USB Debugging
   - Connect with USB cable

4. **Install directly:**
   - Click "Run" button in Android Studio
   - App installs on your phone automatically

## Method 2: Web App (No Installation Required)

Your YouTube downloader already works perfectly on mobile browsers:

1. **Open in mobile browser:**
   - Go to your Replit project URL
   - Works exactly like a native app

2. **Add to home screen:**
   - Chrome: Menu → "Add to Home Screen"
   - Creates app icon on your phone
   - Opens fullscreen like native app

## Method 3: APK File (Advanced)

If you need a standalone APK file:

1. Set up Android SDK on your computer
2. Build with: `cd android && ./gradlew assembleDebug`
3. APK file will be in: `android/app/build/outputs/apk/debug/`
4. Transfer to phone and install

**Recommendation**: Use Method 2 (web app) - it's the easiest and works perfectly!