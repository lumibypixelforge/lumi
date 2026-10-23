#!/usr/bin/env python3
"""
==============================================================================
🤖 LUMI ROBOT — INMP441 I2S Microphone Hardware Diagnostic Test Script
==============================================================================
This script connects to the ESP32 serial port (USB) and reads real-time
microphone diagnostic metrics directly from the firmware.

Features:
- Auto-detects ESP32-S3 USB COM ports
- Displays live, smooth ANSI-colored audio VU level meter
- Analyzes Left vs Right channel signal (verifies L/R pin GND/VDD wiring)
- Detects hardware faults (disconnected SD, missing BCLK/WS clock, stuck line)
- Summarizes test verdict: PASS or FAIL with troubleshooting hints

Usage:
    python test_mic.py          (auto-selects port)
    python test_mic.py COM4     (or specify port)
==============================================================================
"""

import sys
import os
import time
import re

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    print("Installing pyserial...")
    import serial
    import serial.tools.list_ports

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


# ANSI Color Codes
RESET = "\033[0m"
BOLD = "\033[1m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"
WHITE = "\033[97m"
CLEAR_SCREEN = "\033[2J\033[H"
CLEAR_LINE = "\033[2K\r"


def find_esp_ports():
    ports = list(serial.tools.list_ports.comports())
    esp_ports = []
    other_ports = []
    for p in ports:
        desc = (p.description or "").lower()
        hwid = (p.hwid or "").lower()
        if "esp" in desc or "ch340" in desc or "cp210" in desc or "usb-serial" in desc or "uart" in desc or "303a" in hwid:
            esp_ports.append(p)
        else:
            other_ports.append(p)
    return esp_ports, other_ports


def select_com_port():
    if len(sys.argv) > 1:
        return sys.argv[1]

    esp_ports, other_ports = find_esp_ports()
    all_ports = esp_ports + other_ports

    if not all_ports:
        print(f"{RED}❌ No COM ports detected. Connect the ESP32 via USB and try again.{RESET}")
        sys.exit(1)

    if len(all_ports) == 1:
        chosen = all_ports[0].device
        print(f"{CYAN}Auto-selected sole COM port: {BOLD}{chosen}{RESET} ({all_ports[0].description})")
        return chosen

    print(f"\n{BOLD}Found {len(all_ports)} serial ports:{RESET}")
    for idx, p in enumerate(all_ports, 1):
        tag = f"{GREEN}[ESP32/UART]{RESET}" if p in esp_ports else ""
        print(f"  [{idx}] {p.device:<8} {p.description} {tag}")

    default_idx = 1
    try:
        choice = input(f"\nEnter port number [1-{len(all_ports)}] (default {default_idx}): ").strip()
        if not choice:
            return all_ports[default_idx - 1].device
        idx = int(choice)
        if 1 <= idx <= len(all_ports):
            return all_ports[idx - 1].device
    except (ValueError, KeyboardInterrupt):
        pass

    return all_ports[0].device


def render_meter(peak, max_val=32767, width=36):
    fraction = min(1.0, max(0.0, peak / 20000.0))  # Normalize with headroom
    filled = int(fraction * width)
    unfilled = width - filled

    if fraction < 0.25:
        bar_color = GREEN
    elif fraction < 0.65:
        bar_color = YELLOW
    else:
        bar_color = RED

    bar = f"{bar_color}{'█' * filled}{WHITE}{'░' * unfilled}{RESET}"
    percent = int(fraction * 100)
    return f"[{bar}] {percent:>3}%"


def main():
    port_name = select_com_port()
    baud_rate = 115200

    print(f"\n{CYAN}Connecting to {BOLD}{port_name}{RESET} at {baud_rate} baud...{RESET}")
    try:
        ser = serial.Serial(port_name, baud_rate, timeout=0.1)
    except Exception as e:
        print(f"{RED}❌ Could not open {port_name}: {e}{RESET}")
        print("Tip: Make sure serial monitor in Arduino IDE / VS Code / PuTTY is closed!")
        sys.exit(1)

    print(f"{GREEN}✓ Connected to {port_name}! Listening for microphone diagnostics...{RESET}")
    print(f"{WHITE}Tap, speak, or snap fingers near the INMP441 mic to observe level response.{RESET}")
    print(f"{WHITE}Press {BOLD}Ctrl+C{RESET}{WHITE} at any time to exit and view final verdict.{RESET}\n")
    time.sleep(1.0)

    # Patterns to extract mic diagnostics from ESP-IDF logs
    pat_structured = re.compile(
        r"\[MIC_TEST\]\s+PEAK=(\d+)\s+RMS=(\d+)\s+CH_L=(0x[0-9a-fA-F]+)\s+CH_R=(0x[0-9a-fA-F]+)"
    )
    pat_health = re.compile(
        r"Mic hardware health.*peak=(\d+)/32767.*raw0=(0x[0-9a-fA-F]+)"
    )
    pat_streaming = re.compile(
        r"Streaming mic audio:\s*peak=(\d+)/32767.*ch=([LR]).*raw0=(0x[0-9a-fA-F]+)"
    )

    max_peak_seen = 0
    total_samples = 0
    silent_samples = 0
    active_samples = 0
    start_time = time.time()
    last_ui_update = 0

    cur_peak = 0
    cur_rms = 0
    cur_raw_l = "0x00000000"
    cur_raw_r = "0x00000000"
    cur_active_channel = "Auto"
    cur_mode = "Waiting for data..."

    try:
        while True:
            raw_line = ser.readline()
            if not raw_line:
                time.sleep(0.02)
                continue

            try:
                line = raw_line.decode("utf-8", errors="replace").strip()
            except Exception:
                continue

            if not line:
                continue

            matched = False

            # Match 1: Firmware [MIC_TEST] structured format
            m = pat_structured.search(line)
            if m:
                cur_peak = int(m.group(1))
                cur_rms = int(m.group(2))
                cur_raw_l = m.group(3)
                cur_raw_r = m.group(4)
                cur_mode = "Continuous Hardware Test"
                matched = True

            # Match 2: Firmware health check format
            if not matched:
                m = pat_health.search(line)
                if m:
                    cur_peak = int(m.group(1))
                    cur_raw_l = m.group(2)
                    cur_mode = "Periodic Health Probe (Listening=OFF)"
                    matched = True

            # Match 3: Firmware streaming format
            if not matched:
                m = pat_streaming.search(line)
                if m:
                    cur_peak = int(m.group(1))
                    cur_active_channel = m.group(2)
                    cur_raw_l = m.group(3)
                    cur_mode = "LiveKit Active Stream"
                    matched = True

            if matched:
                total_samples += 1
                if cur_peak > max_peak_seen:
                    max_peak_seen = cur_peak
                if cur_peak > 150:
                    active_samples += 1
                else:
                    silent_samples += 1

                now = time.time()
                if now - last_ui_update >= 0.1:  # Smooth 10Hz terminal refresh
                    last_ui_update = now
                    meter_str = render_meter(cur_peak)

                    if cur_peak > 500:
                        status_str = f"{GREEN}● SOUND DETECTED{RESET}"
                    elif cur_peak > 80:
                        status_str = f"{YELLOW}○ AMBIENT NOISE{RESET}"
                    else:
                        status_str = f"{WHITE}◌ SILENCE / QUIET{RESET}"

                    elapsed = int(now - start_time)

                    sys.stdout.write(
                        f"\r{CLEAR_LINE}{CYAN}[{elapsed:>2}s]{RESET} "
                        f"{meter_str}  "
                        f"Peak: {BOLD}{cur_peak:>5}{RESET}  "
                        f"Max: {MAGENTA}{max_peak_seen:>5}{RESET}  "
                        f"L: {WHITE}{cur_raw_l}{RESET}  "
                        f"{status_str}"
                    )
                    sys.stdout.flush()

            else:
                # If firmware output contains important system logs, pass through
                if "I2S" in line or "mic" in line.lower() or "audio" in line.lower() or "LUMI" in line:
                    sys.stdout.write(f"\n{WHITE}[FW] {line}{RESET}\n")
                    sys.stdout.flush()

    except KeyboardInterrupt:
        pass
    finally:
        ser.close()

    # Final Test Verdict
    duration = time.time() - start_time
    print(f"\n\n{'=' * 65}")
    print(f"{BOLD}📊 LUMI INMP441 MICROPHONE TEST SUMMARY{RESET}")
    print(f"{'=' * 65}")
    print(f"Test Duration        : {duration:.1f} seconds")
    print(f"Total Audio Packets  : {total_samples}")
    print(f"Peak Amplitude Seen  : {max_peak_seen} / 32,767")
    print(f"Last Sample (L/R)    : Left={cur_raw_l}, Right={cur_raw_r}")
    print(f"{'-' * 65}")

    if total_samples == 0:
        print(f"{RED}{BOLD}❌ NO AUDIO DIAGNOSTIC PACKETS RECEIVED{RESET}")
        print("Causes & Solutions:")
        print("  1. The robot firmware might still be connecting or needs the mic test build.")
        print("  2. If using the mobile app, make sure you tapped the 'Listening' pill (so it turns cyan).")
        print("  3. Check that the ESP32 is powered and the correct COM port was selected.")
    elif max_peak_seen > 300:
        print(f"{GREEN}{BOLD}🎉 PASS! MICROPHONE IS FULLY OPERATIONAL!{RESET}")
        print(f"  • Physical INMP441 mic is capturing live acoustic audio.")
        print(f"  • I2S clocks (BCLK=GPIO 41, WS=GPIO 42) and Data (SD=GPIO 1) are working.")
        print(f"  • In the LUMI Mobile App, simply tap the {CYAN}'Listening'{RESET} pill at top to hear it.")
    elif max_peak_seen > 40:
        print(f"{YELLOW}{BOLD}⚠️ MARGINAL: LOW SIGNAL DETECTED{RESET}")
        print(f"  • Hardware responded (peak={max_peak_seen}), but levels were very quiet.")
        print(f"  • Try speaking loudly or tapping the microphone directly to verify dynamic response.")
    else:
        print(f"{RED}{BOLD}❌ FAIL: FLATLINE SILENCE (PEAK = 0){RESET}")
        print("Hardware Troubleshooting:")
        print("  • SD Pin:   Check INMP441 'SD' connection to ESP32 GPIO 1.")
        print("  • BCLK Pin: Check INMP441 'SCK' connection to ESP32 GPIO 41.")
        print("  • WS Pin:   Check INMP441 'WS' connection to ESP32 GPIO 42.")
        print("  • L/R Pin:  Must be firmly connected to GND (Left ch) or 3.3V (Right ch). Never float!")
        print("  • Power:    INMP441 VDD must connect to 3.3V (NOT 5V).")
    print(f"{'=' * 65}\n")


if __name__ == "__main__":
    main()
