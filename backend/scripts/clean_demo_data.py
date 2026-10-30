"""Database & Storage Demo Data Cleanup Script for Reft.AI.

Performs pre-deployment cleanup:
1. Verifies existing database backup.
2. Removes all demo verification sessions, evidence, product references, and products.
3. Preserves database schema, tables, indexes, and migrations.
4. Cleans orphaned test/demo files from local storage.
5. Preserves primary merchant account (merchant@example.com) with 0 products and 0 sessions for immediate login.
6. Deletes demo merchant (demo@refundtest.local).
"""
import os
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"
STORAGE_DIR = BACKEND_DIR / "storage"
DB_PATH = DATA_DIR / "refund_verification.db"
BACKUP_DIR = DATA_DIR / "backups"

def run_cleanup():
    print("==================================================")
    print("REFT.AI - PRE-DEPLOYMENT DEMO DATA CLEANUP")
    print("==================================================")

    # 1. Ensure backup exists
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"refund_verification_clean_backup_{timestamp}.db"

    src_conn = sqlite3.connect(DB_PATH)
    bck_conn = sqlite3.connect(backup_path)
    with bck_conn:
        src_conn.backup(bck_conn)
    bck_conn.close()
    src_conn.close()

    print(f"[OK] Database backed up to: {backup_path}")

    # 2. Open DB connection with foreign keys
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Tables to clear in reverse FK order
    clear_tables = [
        "evidence_events",
        "visual_analyses",
        "evidence",
        "verification_signals",
        "reasoning_runs",
        "evidence_requests",
        "verification_fusion_results",
        "merchant_decisions",
        "verification_events",
        "verification_sessions",
        "workflow_steps",
        "workflows",
        "product_reference_visual_analyses",
        "product_references",
        "product_visual_profiles",
        "products",
    ]

    record_counts = {}

    # Disable foreign keys temporarily for clean bulk deletion
    cursor.execute("PRAGMA foreign_keys = OFF;")

    for table in clear_tables:
        count = cursor.execute(f'SELECT count(*) FROM "{table}";').fetchone()[0]
        cursor.execute(f'DELETE FROM "{table}";')
        record_counts[table] = count
        print(f"Cleared table '{table}': {count} records removed")

    # Remove demo merchant
    demo_merchant_count = cursor.execute("SELECT count(*) FROM merchants WHERE email = 'demo@refundtest.local';").fetchone()[0]
    cursor.execute("DELETE FROM merchants WHERE email = 'demo@refundtest.local';")
    record_counts["demo_merchants"] = demo_merchant_count
    print(f"Cleared demo merchant 'demo@refundtest.local': {demo_merchant_count} record removed")

    # Re-enable foreign keys and commit
    cursor.execute("PRAGMA foreign_keys = ON;")
    conn.commit()

    # Verify merchant account
    merchants = cursor.execute("SELECT id, email, business_name FROM merchants;").fetchall()
    print("\nPreserved Merchant Accounts:")
    for m in merchants:
        print(f"  ID: {m[0]} | Email: {m[1]} | Business: {m[2]}")

    # Verify 0 products and 0 sessions
    prod_count = cursor.execute("SELECT count(*) FROM products;").fetchone()[0]
    sess_count = cursor.execute("SELECT count(*) FROM verification_sessions;").fetchone()[0]
    print(f"\nVerification check: products count = {prod_count}, verification_sessions count = {sess_count}")

    # Check integrity
    integrity = cursor.execute("PRAGMA integrity_check;").fetchone()[0]
    print(f"Database Integrity: {integrity}")

    conn.close()

    # 3. Clean files in storage/product_references and storage/evidence
    deleted_files_count = 0
    for subfolder in ["product_references", "evidence", "reports"]:
        folder_path = STORAGE_DIR / subfolder
        if folder_path.exists():
            for item in folder_path.iterdir():
                if item.is_file() and item.name != ".gitkeep":
                    try:
                        item.unlink()
                        deleted_files_count += 1
                    except Exception as e:
                        print(f"Could not remove {item}: {e}")
                elif item.is_dir():
                    try:
                        shutil.rmtree(item)
                        deleted_files_count += 1
                    except Exception as e:
                        print(f"Could not remove directory {item}: {e}")

    print(f"\n[OK] Cleaned demo storage files: {deleted_files_count} files removed from storage/")

    # 4. Remove 0-byte stray root db if present
    stray_db = BACKEND_DIR / "refund_verification.db"
    if stray_db.exists() and stray_db.stat().st_size == 0:
        stray_db.unlink()
        print(f"[OK] Removed stray 0-byte database file: {stray_db}")

    print("\n==================================================")
    print("CLEANUP COMPLETED SUCCESSFULLY")
    print("==================================================")

    return {
        "backup_path": str(backup_path),
        "records_removed": record_counts,
        "files_removed": deleted_files_count,
        "preserved_merchants": [m[1] for m in merchants],
    }

if __name__ == "__main__":
    run_cleanup()
