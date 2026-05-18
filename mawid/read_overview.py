import json
import os

log_path = r"C:\Users\DEEL\.gemini\antigravity\brain\9bc5eb04-c46e-4a03-a302-475aa9d937b8\.system_generated\logs\overview.txt"
output_path = r"c:\Users\DEEL\.gemini\antigravity\scratch\mawid\extracted_logs.md"

if not os.path.exists(log_path):
    print(f"Log path does not exist: {log_path}")
    exit(1)

extracted = []
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        if not line.strip():
            continue
        try:
            record = json.loads(line)
            step_idx = record.get('step_index')
            source = record.get('source')
            type_ = record.get('type')
            content = record.get('content', '')
            
            if step_idx >= 1700:
                extracted.append(f"## Step {step_idx} - {source} ({type_})\n")
                if content:
                    extracted.append(content + "\n")
                tool_calls = record.get('tool_calls', [])
                if tool_calls:
                    extracted.append("### Tool Calls:\n")
                    for tc in tool_calls:
                        extracted.append(f"- **{tc.get('name')}**: {json.dumps(tc.get('args'), ensure_ascii=False, indent=2)}\n")
                extracted.append("\n" + "="*80 + "\n\n")
        except Exception as e:
            print(f"Error parsing line: {e}")

with open(output_path, 'w', encoding='utf-8') as out_f:
    out_f.write("".join(extracted))

print(f"Extracted logs written to {output_path}")
