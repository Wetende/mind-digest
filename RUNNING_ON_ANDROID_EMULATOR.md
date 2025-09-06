Running the Well‑Being app in an Android emulator (Windows / PowerShell)

Purpose

This document gives step‑by‑step, copy‑pasteable PowerShell commands and tips to run the `well‑being` (mind‑digest) Expo app on an Android emulator without Android Studio.

Checklist

- [ ] Java JDK installed and JAVA_HOME set
- [ ] Android SDK installed (cmdline-tools, platform‑tools, emulator)
- [ ] Required SDK packages installed: platform-tools, emulator, platforms;android-33, system-images;android-33;google_apis;x86_64
- [ ] AVD created (e.g. `myAVD`)
- [ ] Emulator boots and `adb devices` shows it
- [ ] Metro (Expo) running and connected to emulator

Prerequisites (one-time)

1. Install a Java JDK (11+ recommended). Set JAVA_HOME to the JDK install folder, e.g.:

```powershell
setx JAVA_HOME "C:\Program Files\Java\jdk-17" -m
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-17'
```

2. Install Android SDK command-line tools and put them under `C:\android\sdk` (or another path). Set ANDROID_SDK_ROOT and update PATH:

```powershell
setx ANDROID_SDK_ROOT "C:\android\sdk" -m
$env:ANDROID_SDK_ROOT = 'C:\android\sdk'
# Add to PATH (one-time modify user env or use setx for persistent changes):
setx PATH "$env:PATH;C:\android\sdk\platform-tools;C:\android\sdk\emulator;C:\android\sdk\cmdline-tools\latest\bin" -m
$env:Path = $env:Path + ";C:\android\sdk\platform-tools;C:\android\sdk\emulator;C:\android\sdk\cmdline-tools\latest\bin"
```

3. Verify `sdkmanager`, `avdmanager`, `emulator`, and `adb` are available:

```powershell
sdkmanager --version
avdmanager --version
& "$env:ANDROID_SDK_ROOT\emulator\emulator.exe" -version
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" version
```

One-time SDK packages (if not installed)

Install required packages (example uses API 33):

```powershell
sdkmanager "platform-tools" "emulator" "platforms;android-33" "system-images;android-33;google_apis;x86_64"
# Accept licenses when prompted or run: yes | sdkmanager --licenses
```

Create an AVD (pixel device recommended)

```powershell
avdmanager create avd -n myAVD -k "system-images;android-33;google_apis;x86_64" --device "pixel"
# If it asks about a hardware profile, choose recommended or press Enter
```

Start the emulator (recommended flags for reliability)

Use SwiftShader GPU if host GPU causes issues, and disable snapshots for a clean boot:

```powershell
# Option A: normal (if your GPU & WHP are ok)
& "$env:ANDROID_SDK_ROOT\emulator\emulator.exe" -avd myAVD -no-boot-anim -netdelay none -netspeed full

# Option B: use software renderer (more compatible)
& "$env:ANDROID_SDK_ROOT\emulator\emulator.exe" -avd myAVD -gpu swiftshader_indirect -no-snapshot -no-boot-anim -netdelay none -netspeed full

# Option C: wipe data on failure
& "$env:ANDROID_SDK_ROOT\emulator\emulator.exe" -avd myAVD -wipe-data -no-snapshot -no-boot-anim
```

Wait for the emulator to be detected by adb

```powershell
$adb = "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe"
& $adb start-server
& $adb devices
# Wait until adb shows emulator-<port> device. To check boot completion:
& $adb -s emulator-5554 shell getprop sys.boot_completed  # expects: 1
```

If `adb devices` shows nothing

- Restart adb: `& $env:ANDROID_SDK_ROOT\platform-tools\adb.exe kill-server; & $env:ANDROID_SDK_ROOT\platform-tools\adb.exe start-server`
- Try starting emulator with `-gpu swiftshader_indirect` and `-no-snapshot`.
- Verify Windows Hypervisor Platform is enabled or that Intel HAXM is configured correctly.

Expose host ports to emulator (Metro connectivity)

If you run Expo with `--host localhost`, the emulator needs reverse port forwarding so the emulator can reach the host. Run these (safe to run anytime):

```powershell
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" reverse tcp:8081 tcp:8081
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" reverse tcp:8082 tcp:8082
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" reverse tcp:8084 tcp:8084
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" reverse --list
```

Start Metro / Expo

At the project root (`C:\Projects\well-being`):

```powershell
# Host mode choices:
# - LAN: uses your LAN IP (good when emulator can directly access host IP)
# - localhost: use adb reverse, then emulator connects to 127.0.0.1 on host

# Start with LAN (recommended):
npx expo start --host lan

# If you prefer localhost + adb reverse:
npx expo start --host localhost
# (then press 'a' OR run next step)
```

Launch app on emulator

- From the Expo terminal press `a` (open Android)
- Or from the command line (open Expo URL manually):

```powershell
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8082" -n host.exp.exponent/.LauncherActivity
```

If you see an Expo Go version mismatch

Expo may prompt to install a recommended Expo Go version on the emulator. You can install the exact APK using expo CLI:

```powershell
npx expo client:install:android
```

Or download the correct Expo Go APK and install via adb:

```powershell
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" install -r path\to\ExpoGo.apk
```

Useful dev commands (press inside Expo terminal)

- `a` — open Android
- `r` — reload
- `j` — open debugger
- `m` — toggle menu
- `shift+m` — more tools

Troubleshooting common errors

1. Emulator starts but `adb devices` shows nothing

- Restart adb, restart emulator, use `-gpu swiftshader_indirect` and `-no-snapshot`.
- Kill any stray emulator process and try `-wipe-data`.

2. WebSocket / ReconnectingWebSocket errors in emulator logs

- Ensure adb reverse for Metro ports (8081/8082/8084).
- Or run expo with `--host lan` and ensure emulator can reach your host LAN IP.

3. Expo failing to open automatically

- Start emulator _first_, confirm `adb devices` shows it, then press `a` in the Expo CLI.

4. Slow UI / graphics errors

- Try `-gpu swiftshader_indirect` or update host GPU drivers.
- If WHPX is available, ensure Windows Hypervisor Platform is enabled.

Development builds & features not supported in Expo Go

- Push notifications and some native modules may require a development build or a custom dev client. See:

```powershell
# create a dev client (requires EAS build / config)
npx expo run:android
```

Key ports summary

- 8081: Metro JS bundler (classic RN)
- 8082 / 8084: Expo alternates (Metro sometimes uses 8082/8084)
- Use `adb reverse tcp:<port> tcp:<port>` when using `--host localhost`.

Useful links

- Expo emulator guide: https://docs.expo.dev/workflow/android-studio-emulator
- Expo CLI docs: https://docs.expo.dev/more/expo-cli
- Expo development builds: https://docs.expo.dev/develop/development-builds/introduction
- Android emulator CLI: https://developer.android.com/studio/run/emulator-commandline
- avdmanager docs: https://developer.android.com/studio/command-line/avdmanager
- sdkmanager docs: https://developer.android.com/studio/command-line/sdkmanager
- ADB docs: https://developer.android.com/studio/command-line/adb

Short reference (copy-paste)

```powershell
# start emulator
& "$env:ANDROID_SDK_ROOT\emulator\emulator.exe" -avd myAVD -gpu swiftshader_indirect -no-snapshot -no-boot-anim
# wait for adb to see the emulator
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" start-server
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" devices
# forward ports if using localhost
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" reverse tcp:8081 tcp:8081
& "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe" reverse tcp:8082 tcp:8082
# start expo
npx expo start --host lan
# press `a` in the expo terminal to open Android
```

If you want, I can also:

- Add a small troubleshooting script that waits for adb detection and prints boot status.
- Create an AVD with the exact recommended settings and add a convenience npm script in `package.json` (example: `npm run emu:start`).

---

Saved as `RUNNING_ON_ANDROID_EMULATOR.md` in the project root.
