import { neon } from '@neondatabase/serverless';
import { generateAccessToken } from './security';

const sql = neon(process.env.DATABASE_URL!);

export interface Receipt {
  id: string;
  name: string;
  access_token: string;
  image_url?: string;
  image_type?: string;
  items: ReceiptItem[];
  people: string[];
  tax_rates: TaxRate[];
  tip_config: TipConfig;
  created_at: Date;
  updated_at: Date;
}

export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  applicable_taxes: { [taxId: number]: boolean };
  assigned_people: string[];
}

export interface TaxRate {
  id: number;
  name: string;
  rate: number;
}

export interface TipConfig {
  is_percentage: boolean;
  value: number;
}

export class Database {
  static async createTables() {
    try {
      // Create the main table first
      await sql`
        CREATE TABLE IF NOT EXISTS receipts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          image_url TEXT,
          image_type VARCHAR(50),
          items JSONB NOT NULL DEFAULT '[]',
          people JSONB NOT NULL DEFAULT '[]',
          tax_rates JSONB NOT NULL DEFAULT '[]',
          tip_config JSONB NOT NULL DEFAULT '{"is_percentage": true, "value": 20}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      // Check if access_token column exists and add it if not
      const columnExists = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'receipts' AND column_name = 'access_token'
      `;

      if (columnExists.length === 0) {
        // Add access_token column
        await sql`
          ALTER TABLE receipts
          ADD COLUMN access_token UUID
        `;

        // Update existing rows that don't have access tokens
        await sql`
          UPDATE receipts
          SET access_token = gen_random_uuid()
          WHERE access_token IS NULL
        `;

        // Make access_token NOT NULL after populating
        await sql`
          ALTER TABLE receipts
          ALTER COLUMN access_token SET NOT NULL
        `;

        // Add unique constraint
        await sql`
          ALTER TABLE receipts
          ADD CONSTRAINT receipts_access_token_unique UNIQUE (access_token)
        `;
      }

      await sql`
        CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_receipts_access_token ON receipts(access_token)
      `;

      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  static async createReceipt(receipt: Omit<Receipt, 'id' | 'access_token' | 'created_at' | 'updated_at'>): Promise<Receipt> {
    try {
      const accessToken = generateAccessToken();

      const result = await sql`
        INSERT INTO receipts (name, access_token, image_url, image_type, items, people, tax_rates, tip_config)
        VALUES (
          ${receipt.name},
          ${accessToken},
          ${receipt.image_url || null},
          ${receipt.image_type || null},
          ${JSON.stringify(receipt.items)},
          ${JSON.stringify(receipt.people)},
          ${JSON.stringify(receipt.tax_rates)},
          ${JSON.stringify(receipt.tip_config)}
        )
        RETURNING *
      `;

      return this.parseReceipt(result[0]);
    } catch (error) {
      console.error('Error creating receipt:', error);
      throw error;
    }
  }

  static async getReceipt(id: string): Promise<Receipt | null> {
    try {
      const result = await sql`
        SELECT * FROM receipts WHERE id = ${id}
      `;

      return result.length > 0 ? this.parseReceipt(result[0]) : null;
    } catch (error) {
      console.error('Error fetching receipt:', error);
      throw error;
    }
  }

  static async getReceiptByToken(accessToken: string): Promise<Receipt | null> {
    try {
      const result = await sql`
        SELECT * FROM receipts WHERE access_token = ${accessToken}
      `;

      return result.length > 0 ? this.parseReceipt(result[0]) : null;
    } catch (error) {
      console.error('Error fetching receipt by token:', error);
      throw error;
    }
  }

  static async updateReceipt(id: string, updates: Partial<Omit<Receipt, 'id' | 'created_at' | 'updated_at'>>): Promise<Receipt | null> {
    try {
      // Simplified update approach - just update all fields
      const result = await sql`
        UPDATE receipts
        SET
          name = ${updates.name || ''},
          image_url = ${updates.image_url || null},
          image_type = ${updates.image_type || null},
          items = ${JSON.stringify(updates.items || [])},
          people = ${JSON.stringify(updates.people || [])},
          tax_rates = ${JSON.stringify(updates.tax_rates || [])},
          tip_config = ${JSON.stringify(updates.tip_config || {})},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return result.length > 0 ? this.parseReceipt(result[0]) : null;
    } catch (error) {
      console.error('Error updating receipt:', error);
      throw error;
    }
  }

  static async deleteReceipt(id: string): Promise<boolean> {
    try {
      const result = await sql`
        DELETE FROM receipts WHERE id = ${id}
      `;

      return result.length > 0;
    } catch (error) {
      console.error('Error deleting receipt:', error);
      throw error;
    }
  }

  static async listReceipts(limit: number = 50): Promise<Receipt[]> {
    try {
      const result = await sql`
        SELECT * FROM receipts
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `;

      return result.map(row => this.parseReceipt(row));
    } catch (error) {
      console.error('Error listing receipts:', error);
      throw error;
    }
  }

  private static parseReceipt(row: any): Receipt {
    return {
      id: row.id,
      name: row.name,
      access_token: row.access_token,
      image_url: row.image_url,
      image_type: row.image_type,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      people: typeof row.people === 'string' ? JSON.parse(row.people) : row.people,
      tax_rates: typeof row.tax_rates === 'string' ? JSON.parse(row.tax_rates) : row.tax_rates,
      tip_config: typeof row.tip_config === 'string' ? JSON.parse(row.tip_config) : row.tip_config,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

export default sql;