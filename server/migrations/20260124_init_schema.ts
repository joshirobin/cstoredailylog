import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    // Accounts Table
    await knex.schema.createTable("accounts", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.string("contact").notNullable();
        table.string("email").notNullable();
        table.string("phone");
        table.text("address");
        table.decimal("balance", 12, 2).defaultTo(0);
        table.decimal("credit_limit", 12, 2).defaultTo(0);
        table.enum("status", ["Active", "Overdue", "Inactive"]).defaultTo("Active");
        table.timestamps(true, true);
    });

    // Daily Sales Table
    await knex.schema.createTable("daily_sales", (table) => {
        table.increments("id").primary();
        table.date("date").notNullable().unique();
        table.decimal("opening_cash", 12, 2).defaultTo(0);
        table.jsonb("opening_denominations");
        table.decimal("closing_cash", 12, 2).defaultTo(0);
        table.jsonb("closing_denominations");
        table.decimal("expenses", 12, 2).defaultTo(0);
        table.decimal("total_sales", 12, 2).defaultTo(0);
        table.text("notes");
        table.decimal("safe_cash", 12, 2).defaultTo(0);
        table.jsonb("safe_cash_details");
        table.jsonb("checks");
        table.decimal("safe_total", 12, 2).defaultTo(0);
        table.timestamps(true, true);
    });

    // Invoices Table
    await knex.schema.createTable("invoices", (table) => {
        table.string("id").primary(); // Usually INV-XXXXXX
        table.integer("account_id").unsigned().references("id").inTable("accounts").onDelete("CASCADE");
        table.string("account_name");
        table.date("date").notNullable();
        table.date("due_date");
        table.decimal("subtotal", 12, 2).notNullable();
        table.decimal("tax", 12, 2).notNullable();
        table.decimal("total", 12, 2).notNullable();
        table.enum("status", ["Draft", "Sent", "Paid"]).defaultTo("Draft");
        table.boolean("email_sent").defaultTo(false);
        table.timestamp("sent_at");
        table.string("recipient_email");
        table.timestamps(true, true);
    });

    // Invoice Items
    await knex.schema.createTable("invoice_items", (table) => {
        table.increments("id").primary();
        table.string("invoice_id").references("id").inTable("invoices").onDelete("CASCADE");
        table.string("description").notNullable();
        table.integer("qty").defaultTo(1);
        table.decimal("price", 12, 2).notNullable();
        table.decimal("total", 12, 2).notNullable();
    });

    // Scanned Invoices (Logs)
    await knex.schema.createTable("scanned_logs", (table) => {
        table.increments("id").primary();
        table.string("vendor_name");
        table.date("date");
        table.decimal("total_amount", 12, 2);
        table.text("raw_text");
        table.string("image_url");
        table.enum("status", ["Pending", "Processed", "Error"]).defaultTo("Pending");
        table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("scanned_logs");
    await knex.schema.dropTableIfExists("invoice_items");
    await knex.schema.dropTableIfExists("invoices");
    await knex.schema.dropTableIfExists("daily_sales");
    await knex.schema.dropTableIfExists("accounts");
}
