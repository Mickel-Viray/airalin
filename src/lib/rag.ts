import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY!
let detectedEmbeddingModel: string | null = null

/**
 * Splits text into overlapping chunks for retrieval context
 */
export function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = []
  let startIndex = 0

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize

    if (endIndex < text.length) {
      const nextPeriod = text.indexOf('.', endIndex)
      const nextNewline = text.indexOf('\n', endIndex)
      const breakPoint = Math.min(
        nextPeriod !== -1 ? nextPeriod + 1 : endIndex,
        nextNewline !== -1 ? nextNewline + 1 : endIndex
      )
      if (breakPoint - startIndex <= chunkSize + 150) {
        endIndex = breakPoint
      }
    }

    const chunk = text.slice(startIndex, endIndex).trim()
    if (chunk.length > 30) {
      chunks.push(chunk)
    }

    startIndex = endIndex - overlap
  }

  return chunks
}

/**
 * Auto-discovers the active embedding model supported by the user's API key
 */

async function getAvailableEmbeddingModel(): Promise<string> {
  if (detectedEmbeddingModel) return detectedEmbeddingModel

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )
    if (res.ok) {
      const data = await res.json()
      const embeddingModel = data.models?.find((m: any) =>
        m.supportedGenerationMethods?.includes('embedContent')
      )
      if (embeddingModel?.name) {
        const modelName = String(embeddingModel.name)
        detectedEmbeddingModel = modelName
        return modelName
      }
    }
  } catch (e) {
    console.warn('Could not auto-list models, falling back to default:', e)
  }

  // Default fallback if listing is restricted
  detectedEmbeddingModel = 'models/text-embedding-004'
  return detectedEmbeddingModel
}

/**
 * Generates a 768-dimension vector with dynamic model discovery and fallback
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const modelName = await getAvailableEmbeddingModel()

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${modelName}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
    }
  )

  if (!response.ok) {
    // If the API key does not have embedding access, provide a deterministic fallback vector
    console.warn(`Embedding API returned status ${response.status}. Using local vector fallback.`)
    return new Array(768).fill(0).map((_, i) => Math.sin(text.length + i) * 0.01)
  }

  const data = await response.json()
  return data.embedding?.values || new Array(768).fill(0)
}