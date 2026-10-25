---
title: Zomato AI Recommender Backend
emoji: 🍜
colorFrom: red
colorTo: yellow
sdk: gradio
sdk_version: 6.30.0
app_file: app.py
pinned: false
short_description: AI restaurant recommendation backend for Bangalore
---

# 🍜 Zomato AI Recommender — Backend API

Backend service for the **Zomato AI Restaurant Recommender** web application.

- **Frontend App**: [https://zomato-ai-recommender-amber.vercel.app](https://zomato-ai-recommender-amber.vercel.app)
- **GitHub Repository**: [https://github.com/Saurabh682/zomato-ai-recommender](https://github.com/Saurabh682/zomato-ai-recommender)

## API Endpoints

- `GET /health` — Health check and dataset size status.
- `POST /api/recommend` — Multi-model LLM recommendation engine (Groq GPT-OSS 120B / Gemini 3.8 Flash fallback).
- `POST /api/recommend/more` — Expanded restaurant recommendations for pagination and load-more.
- `GET /docs` — Interactive OpenAPI / Swagger API reference.
