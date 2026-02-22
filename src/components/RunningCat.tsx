"use client"

import React from "react"

const BODY = "#1c1c1c"
const LEG = "#111111"
const EAR = "#ffb7b7"
const EYE = "#ffd54f"

const W = 40
const H = 32

type Pixel = string | null
type Frame = Pixel[][]

function createFrame(): Frame {
  return Array.from({ length: H }, () => Array(W).fill(null))
}

function drawRect(f: Frame, r1: number, r2: number, c1: number, c2: number, color: string) {
  const startR = Math.floor(r1)
  const endR = Math.floor(r2)
  const startC = Math.floor(c1)
  const endC = Math.floor(c2)

  for (let r = startR; r <= endR; r++)
    for (let c = startC; c <= endC; c++)
      if (r >= 0 && r < H && c >= 0 && c < W)
        f[r][c] = color
}

function drawLeg(f: Frame, hipX: number, hipY: number, phase: number, front: boolean) {
  const swing = Math.sin(phase) * 2

  const kneeY = hipY + 3
  const footY = hipY + 6

  const footX = hipX + Math.round(front ? swing : -swing)

  if (kneeY < H) f[kneeY][hipX] = LEG
  if (footY < H && footX >= 0 && footX < W) f[footY][footX] = LEG
}

function generateFrames(): Frame[] {
  const frames: Frame[] = []

  for (let i = 0; i < 8; i++) {
    const f = createFrame()
    const phase = (i / 8) * Math.PI * 2

    const vertical = Math.round(Math.sin(phase) * 1) // VERY subtle
    const torsoTop = 10 + vertical
    const torsoBottom = 17 + vertical

    // Torso
    drawRect(f, torsoTop, torsoBottom, 10, 24, BODY)

    // Head (stable — minimal vertical movement)
    drawRect(f, 6 + vertical * 0.5, 11 + vertical * 0.5, 22, 30, BODY)

    // Ears
    f[5 + vertical][24] = BODY
    f[5 + vertical][29] = BODY
    f[6 + vertical][24] = EAR
    f[6 + vertical][29] = EAR

    // Eyes
    f[8 + vertical][26] = EYE
    f[8 + vertical][28] = EYE

    // Hip + Shoulder anchors
    const hipX = 12
    const shoulderX = 22
    const anchorY = torsoBottom

    // Back leg
    drawLeg(f, hipX, anchorY, phase, false)

    // Front leg (phase shifted)
    drawLeg(f, shoulderX, anchorY - 1, phase + Math.PI, true)

    // Tail (phase delayed)
    const tailSwing = Math.round(Math.sin(phase - 0.8) * 2)
    f[14 + vertical][9 - tailSwing] = BODY
    f[13 + vertical][8 - tailSwing] = BODY
    f[12 + vertical][7 - tailSwing] = BODY

    frames.push(f)
  }

  return frames
}

const FRAMES = generateFrames()

function framesToSvg(frames: Frame[]): string {
  const parts: string[] = []

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]
    const xOffset = i * W

    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        if (frame[r][c]) {
          parts.push(
            `<rect x="${xOffset + c}" y="${r}" width="1" height="1" fill="${frame[r][c]}"/>`
          )
        }
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${frames.length * W}" height="${H}" shape-rendering="crispEdges">${parts.join("")}</svg>`
}

const catUri = `data:image/svg+xml,${encodeURIComponent(framesToSvg(FRAMES))}`

export default function RunningCat() {
  return (
    <div className="fixed bottom-0 left-0 w-full pointer-events-none z-10 overflow-hidden h-60">
      <div
        className="absolute bottom-16"
        style={{
          width: "320px",
          height: "256px",
          backgroundImage: `url("${catUri}")`,
          backgroundSize: `${FRAMES.length * 320}px 256px`,
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
          animation:
            "run 0.8s steps(8) infinite, move 18s linear infinite",
        }}
      />
      <style jsx>{`
        @keyframes run {
          from { background-position: 0px; }
          to { background-position: -2560px; }
        }

        @keyframes move {
          0% { left: -350px; }
          100% { left: 110vw; }
        }
      `}</style>
    </div>
  )
}