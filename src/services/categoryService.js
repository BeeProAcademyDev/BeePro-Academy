import { categories as mockCategories } from '../data/courses'

export const categoryService = {
  // Get all categories
  async getCategories() {
    // Categories are static based on the schema
    return mockCategories
  }
}
