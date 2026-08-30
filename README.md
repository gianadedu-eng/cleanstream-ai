# CleanStream AI v0.2

This version adds a real AI classification endpoint using Cloudflare Workers AI. It keeps the 10 calibration titles and adds an `/api/analyze` endpoint for unknown titles when the AI binding is enabled.

## Important
The AI must not be exposed directly from browser code. This project calls the model server-side through the Cloudflare `AI` binding.

## Cloudflare deployment
Use a Workers project with Static Assets and add the Workers AI binding named `AI`. The supplied `wrangler.jsonc` is ready for a developer/Cloudflare deployment. If using the dashboard, add a Workers AI binding to this Worker with variable name `AI`.

The current browser-upload method used for v0.1 only uploads static files; it does not install the Worker API code. Therefore v0.2 requires a proper Worker deployment or a developer to configure the Worker script and AI binding.

## Model
Default: `@cf/google/gemma-4-26b-a4b-it`. Cloudflare currently lists this model as available through Workers AI.

## Safety/product rule
This classifier is a decision-support prototype. It must not claim that a title was researched unless evidence was actually supplied/retrieved. Unknown evidence becomes YELLOW rather than a false GREEN.
