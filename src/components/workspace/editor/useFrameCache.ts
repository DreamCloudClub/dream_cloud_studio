import { useRef, useCallback, useMemo } from "react"

/**
 * LRU (Least Recently Used) cache node
 */
interface CacheNode {
  key: string
  value: string
  prev: CacheNode | null
  next: CacheNode | null
}

/**
 * LRU Cache implementation for frame data
 * Maintains a doubly-linked list for O(1) access and eviction
 */
class LRUCache {
  private capacity: number
  private cache: Map<string, CacheNode>
  private head: CacheNode | null
  private tail: CacheNode | null

  constructor(capacity: number) {
    this.capacity = capacity
    this.cache = new Map()
    this.head = null
    this.tail = null
  }

  /**
   * Move a node to the front of the list (most recently used)
   */
  private moveToFront(node: CacheNode): void {
    if (node === this.head) return

    // Remove from current position
    if (node.prev) {
      node.prev.next = node.next
    }
    if (node.next) {
      node.next.prev = node.prev
    }
    if (node === this.tail) {
      this.tail = node.prev
    }

    // Add to front
    node.prev = null
    node.next = this.head
    if (this.head) {
      this.head.prev = node
    }
    this.head = node

    if (!this.tail) {
      this.tail = node
    }
  }

  /**
   * Remove the least recently used item (from tail)
   */
  private evict(): void {
    if (!this.tail) return

    const keyToRemove = this.tail.key
    this.cache.delete(keyToRemove)

    if (this.tail.prev) {
      this.tail.prev.next = null
      this.tail = this.tail.prev
    } else {
      // Only one item in cache
      this.head = null
      this.tail = null
    }
  }

  /**
   * Get a value from the cache
   */
  get(key: string): string | null {
    const node = this.cache.get(key)
    if (!node) return null

    // Move to front (mark as recently used)
    this.moveToFront(node)
    return node.value
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: string): void {
    // Check if key already exists
    const existingNode = this.cache.get(key)
    if (existingNode) {
      existingNode.value = value
      this.moveToFront(existingNode)
      return
    }

    // Evict if at capacity
    if (this.cache.size >= this.capacity) {
      this.evict()
    }

    // Create new node and add to front
    const newNode: CacheNode = {
      key,
      value,
      prev: null,
      next: this.head,
    }

    if (this.head) {
      this.head.prev = newNode
    }
    this.head = newNode

    if (!this.tail) {
      this.tail = newNode
    }

    this.cache.set(key, newNode)
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    return this.cache.has(key)
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear()
    this.head = null
    this.tail = null
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size
  }
}

/**
 * Generate a cache key from video path and timestamp
 */
function getCacheKey(videoPath: string, timestamp: number): string {
  // Round timestamp to nearest 10ms to avoid floating point precision issues
  const roundedTimestamp = Math.round(timestamp * 100) / 100
  return `${videoPath}:${roundedTimestamp}`
}

/**
 * Frame cache interface
 */
export interface FrameCache {
  /** Get a cached frame if available */
  getFrame: (videoPath: string, timestamp: number) => string | null
  /** Store a frame in the cache */
  setFrame: (videoPath: string, timestamp: number, data: string) => void
  /** Preload multiple frames into the cache */
  preloadFrames: (
    videoPath: string,
    timestamps: number[],
    fetchFn: (videoPath: string, timestamp: number) => Promise<string>
  ) => Promise<void>
  /** Clear all cached frames */
  clearCache: () => void
  /** Check if a frame is cached */
  hasFrame: (videoPath: string, timestamp: number) => boolean
  /** Get current cache size */
  getCacheSize: () => number
}

/**
 * useFrameCache - Hook for caching decoded video frames
 *
 * Implements an LRU (Least Recently Used) eviction policy to manage memory.
 * Keys are formatted as `${videoPath}:${timestamp}` where timestamp is rounded
 * to avoid floating point precision issues.
 *
 * @param maxSize - Maximum number of frames to cache (default: 100)
 * @returns FrameCache interface for managing cached frames
 */
export function useFrameCache(maxSize: number = 100): FrameCache {
  // Use a ref to persist the cache across renders
  const cacheRef = useRef<LRUCache | null>(null)

  // Initialize cache lazily
  if (!cacheRef.current) {
    cacheRef.current = new LRUCache(maxSize)
  }

  // Get a cached frame
  const getFrame = useCallback(
    (videoPath: string, timestamp: number): string | null => {
      const cache = cacheRef.current
      if (!cache) return null

      const key = getCacheKey(videoPath, timestamp)
      return cache.get(key)
    },
    []
  )

  // Store a frame in the cache
  const setFrame = useCallback(
    (videoPath: string, timestamp: number, data: string): void => {
      const cache = cacheRef.current
      if (!cache) return

      const key = getCacheKey(videoPath, timestamp)
      cache.set(key, data)
    },
    []
  )

  // Check if a frame is cached
  const hasFrame = useCallback(
    (videoPath: string, timestamp: number): boolean => {
      const cache = cacheRef.current
      if (!cache) return false

      const key = getCacheKey(videoPath, timestamp)
      return cache.has(key)
    },
    []
  )

  // Preload multiple frames
  const preloadFrames = useCallback(
    async (
      videoPath: string,
      timestamps: number[],
      fetchFn: (videoPath: string, timestamp: number) => Promise<string>
    ): Promise<void> => {
      const cache = cacheRef.current
      if (!cache) return

      // Filter out already cached timestamps
      const uncachedTimestamps = timestamps.filter((ts) => {
        const key = getCacheKey(videoPath, ts)
        return !cache.has(key)
      })

      if (uncachedTimestamps.length === 0) return

      // Fetch frames in parallel with a concurrency limit
      const CONCURRENCY = 4
      const batches: number[][] = []

      for (let i = 0; i < uncachedTimestamps.length; i += CONCURRENCY) {
        batches.push(uncachedTimestamps.slice(i, i + CONCURRENCY))
      }

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(async (timestamp) => {
            const data = await fetchFn(videoPath, timestamp)
            return { timestamp, data }
          })
        )

        // Store successful results
        for (const result of results) {
          if (result.status === "fulfilled") {
            const { timestamp, data } = result.value
            const key = getCacheKey(videoPath, timestamp)
            cache.set(key, data)
          }
        }
      }
    },
    []
  )

  // Clear the cache
  const clearCache = useCallback((): void => {
    const cache = cacheRef.current
    if (cache) {
      cache.clear()
    }
  }, [])

  // Get current cache size
  const getCacheSize = useCallback((): number => {
    const cache = cacheRef.current
    return cache ? cache.size : 0
  }, [])

  // Return memoized interface to prevent unnecessary re-renders
  return useMemo(
    () => ({
      getFrame,
      setFrame,
      preloadFrames,
      clearCache,
      hasFrame,
      getCacheSize,
    }),
    [getFrame, setFrame, preloadFrames, clearCache, hasFrame, getCacheSize]
  )
}
