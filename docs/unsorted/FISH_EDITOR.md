# Fish Editor - AI Asset Testing Environment

A dedicated live testing environment for AI-generated fish sprites and backgrounds accessible from the main menu.

## Features

### Live Playable Scene
- Full physics-enabled game environment
- Control player fish with WASD or Arrow Keys
- Real-time testing of AI-generated assets

### AI Generation Panel
Located on the left side with full control over:
- **Model Selection**: Choose between Google Imagen Fast (recommended), Imagen Standard, or Flux 2 Pro
- **Fish Generation**: Generate prey, predator, or mutant fish with editable prompts
- **Background Generation**: Create underwater scenes with preset themes or custom prompts

### Asset Management
- **Spawn Fish**: Drop AI-generated fish into the scene for testing
- **Set Player Fish**: Replace the player character with any generated fish
- **Set Background**: Apply generated backgrounds to the scene
- **Save to Game**: Save assets directly to `/public/sprites/fish/` or `/public/backgrounds/`

### Scene Controls
- View spawned fish count
- Clear all spawned fish
- Reset background to default
- Reset player fish to default

## Workflow

1. **Generate a Fish**
   - Select fish type (prey/predator/mutant)
   - Edit prompt if needed
   - Click "Generate Fish"
   - Preview appears with options

2. **Test in Scene**
   - Click "Spawn" to add fish to the swimming scene
   - Click "Set Player" to make it your controllable fish
   - Use WASD/Arrows to move around

3. **Generate Background**
   - Choose a preset (underwater/deep/tropical) or write custom prompt
   - Click "Generate Background"
   - Click "Set BG" to apply to scene

4. **Save Assets**
   - Click "Save" on any generated fish or background
   - Files go directly to game asset directories
   - Ready to use in actual gameplay

## Transparency Challenge

Fish prompts request "isolated on transparent background" and "PNG cutout style" but AI models may still generate fake backgrounds. The editor helps you quickly test how fish look against different backgrounds to identify transparency issues.

## Access

Available from main menu: "Fish Editor (AI Testing)"

## Cost-Effective Testing

Test multiple variations before saving to avoid wasting API credits on unsuitable assets. The live scene preview helps you immediately see if a fish sprite works well for gameplay.
