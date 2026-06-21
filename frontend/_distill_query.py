import sqlite3
import json
import time

DB = r"C:\Users\yexe\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

print("=== RAW USER MESSAGE DATA ===")
c.execute("""
    SELECT m.session_id, s.title, m.data
    FROM message m
    JOIN session s ON s.id = m.session_id
    WHERE json_extract(m.data, '$.role') = 'user'
    ORDER BY m.time_created
    LIMIT 5
""")
for m in c.fetchall():
    raw = json.loads(m['data'])
    print(f"\n  Session: {m['title'][:30] if m['title'] else m['session_id'][:20]}")
    print(f"  Keys: {list(raw.keys())}")
    content = raw.get('content')
    if content:
        if isinstance(content, list):
            for item in content:
                if isinstance(item, dict):
                    print(f"  Content item type: {item.get('type', '?')}")
                    if 'text' in item:
                        print(f"    Text: {item['text'][:200]}")
                    elif 'image' in item:
                        print(f"    Image: (base64 data)")
                    else:
                        print(f"    Keys: {list(item.keys())}")
        else:
            print(f"  Content: {str(content)[:200]}")
    else:
        print(f"  Full data keys: {list(raw.keys())}")
        print(f"  Data preview: {json.dumps(raw, ensure_ascii=False)[:300]}")

print("\n=== ASSISTANT TEXT CONTENT (Auto Dream session) ===")
c.execute("""
    SELECT json_extract(p.data, '$.text') as text
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = 'ses_11fedac0dffeCJ8OAAkNtvdgO8'
      AND json_extract(p.data, '$.type') = 'text'
    ORDER BY p.time_created
    LIMIT 5
""")
for r in c.fetchall():
    if r['text']:
        print(f"  {r['text'][:300]}")
        print("---")

print("\n=== BLENDER TOOL CALLS (yexe.net session) ===")
c.execute("""
    SELECT json_extract(p.data, '$.tool') as tool,
           json_extract(p.data, '$.state.input') as input_data
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = 'ses_11feeb09affeOPSlW77R2XKq2i'
      AND json_extract(p.data, '$.type') = 'tool'
    ORDER BY p.time_created
    LIMIT 20
""")
for r in c.fetchall():
    tool = r['tool']
    inp = r['input_data']
    if inp:
        inp_obj = json.loads(inp)
        if tool == 'mcp__blender__execute_blender_code':
            code = inp_obj.get('code', inp_obj.get('command', '?'))
            print(f"  blender code: {str(code)[:200]}")
        else:
            print(f"  {tool}: {json.dumps(inp_obj, ensure_ascii=False)[:150]}")

print("\n=== DONE ===")
conn.close()
