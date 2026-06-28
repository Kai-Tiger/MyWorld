from pathlib import Path
import json
import re
import time
import urllib.parse
import urllib.request

ROOT = Path("docs/requirements")
BATCH_SIZE = 20
PROTECT_RE = re.compile(r"(`[^`]*`|https?://[^\s)]+)")
MARK_RE = re.compile(r"§§(\d+)§§")

SKIP_WORDS = {
    "alpha", "GLSL", "WebGL", "Playwright", "UV", "LOD", "GPU", "HUD",
    "Poly", "Haven", "JPG", "TAA", "ACES", "HDR", "SceneRT", "DPR",
}


def protect(text):
    protected = []
    def repl(match):
        protected.append(match.group(0))
        return f"⟦CODE{len(protected)-1}⟧"
    return PROTECT_RE.sub(repl, text), protected


def restore(text, protected):
    for i, value in enumerate(protected):
        text = text.replace(f"⟦CODE{i}⟧", value)
        text = text.replace(f"【CODE{i}】", value)
        text = text.replace(f"[CODE{i}]", value)
    return text


def needs_translation(line, in_fence):
    if in_fence or not line.strip():
        return False
    t = PROTECT_RE.sub("", line)
    words = re.findall(r"[A-Za-z][A-Za-z-]{2,}", t)
    return any(w not in SKIP_WORDS and not w.isupper() for w in words)


def translate_batch(items):
    text = "\n".join(f"§§{idx}§§ {content}" for idx, content in items)
    url = "https://translate.googleapis.com/translate_a/single?" + urllib.parse.urlencode({
        "client": "gtx", "sl": "auto", "tl": "zh-CN", "dt": "t", "q": text
    })
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, timeout=25) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            translated = "".join(part[0] for part in data[0] if part and part[0])
            break
        except Exception:
            if attempt == 4:
                raise
            time.sleep(2 * (attempt + 1))
    matches = list(MARK_RE.finditer(translated))
    out = {}
    for pos, match in enumerate(matches):
        idx = int(match.group(1))
        start = match.end()
        end = matches[pos + 1].start() if pos + 1 < len(matches) else len(translated)
        out[idx] = translated[start:end].strip()
    return out


def clean(text):
    text = text.replace("运行`", "运行 `").replace("确认`", "确认 `").replace("检查`", "检查 `")
    text = re.sub(r"([\u4e00-\u9fff])\s+([\u4e00-\u9fff])", r"\1\2", text)
    return text


def main():
    files = sorted(ROOT.glob("*.md"))
    contents = {p: p.read_text(encoding="utf-8").splitlines(keepends=True) for p in files}
    queue = []
    refs = []
    for path, lines in contents.items():
        in_fence = False
        for line_no, line in enumerate(lines):
            if line.strip().startswith("```"):
                in_fence = not in_fence
                continue
            if not needs_translation(line, in_fence):
                continue
            newline = "\n" if line.endswith("\n") else ""
            body = line[:-1] if newline else line
            protected, values = protect(body)
            queue.append((len(refs), protected))
            refs.append((path, line_no, values, newline))
    translated = {}
    for start in range(0, len(queue), BATCH_SIZE):
        translated.update(translate_batch(queue[start:start+BATCH_SIZE]))
        time.sleep(0.15)
    for idx, _ in queue:
        if idx not in translated:
            continue
        path, line_no, protected, newline = refs[idx]
        contents[path][line_no] = clean(restore(translated[idx], protected)) + newline
    for path, lines in contents.items():
        path.write_text("".join(lines), encoding="utf-8")
    print(f"translated residual lines: {len(queue)}")


if __name__ == "__main__":
    main()
