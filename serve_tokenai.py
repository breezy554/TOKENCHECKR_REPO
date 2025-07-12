from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from peft import PeftModel
from fastapi import FastAPI, Request
import uvicorn

app = FastAPI()

print("🧠 Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained("TinyLlama/TinyLlama-1.1B-Chat-v1.0")

print("📦 Loading base model...")
base_model = AutoModelForCausalLM.from_pretrained("TinyLlama/TinyLlama-1.1B-Chat-v1.0")

print("🔗 Loading LoRA adapter...")
model = PeftModel.from_pretrained(
    base_model,
    "C:/Users/Cbree/velkron-tokenai/velkron-tokenai-out",
    adapter_name="default",
    is_trainable=False
)

pipe = pipeline("text-generation", model=model, tokenizer=tokenizer)

@app.post("/explain")
async def explain(request: Request):
    body = await request.json()
    flags = body.get("flags", [])
    input_text = "Flags: " + ", ".join(flags)
    prompt = f"### Explain:\n{input_text}\n### Answer:\n"
    output = pipe(prompt, max_new_tokens=200)[0]["generated_text"]
    return { "explanation": output.replace(prompt, "").strip() }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=11434)
