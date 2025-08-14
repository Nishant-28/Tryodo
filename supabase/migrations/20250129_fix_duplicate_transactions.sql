-- Fix Duplicate Transactions Migration
-- 1. Clean up existing duplicate transactions
-- 2. Add unique constraint to prevent future duplicates

-- Step 1: Identify and clean up existing duplicates
-- Keep only the oldest transaction for each duplicate group
WITH duplicate_transactions AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY order_id, order_item_id, transaction_type, gross_amount 
      ORDER BY created_at ASC
    ) as row_num
  FROM public.transactions
)
DELETE FROM public.transactions 
WHERE id IN (
  SELECT id FROM duplicate_transactions WHERE row_num > 1
);

-- Step 2: Add unique constraint to prevent future duplicates
-- This constraint ensures no duplicate transactions for the same order item with same type and amount
ALTER TABLE public.transactions 
ADD CONSTRAINT unique_transaction_per_order_item_type_amount 
UNIQUE (order_id, order_item_id, transaction_type, gross_amount);

-- Step 3: Add index for better performance on the constraint
CREATE INDEX IF NOT EXISTS idx_transactions_unique_constraint 
ON public.transactions (order_id, order_item_id, transaction_type, gross_amount);

-- Step 4: Add a function to check for potential duplicates before insertion
CREATE OR REPLACE FUNCTION check_transaction_duplicate()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a similar transaction already exists
  IF EXISTS (
    SELECT 1 FROM public.transactions 
    WHERE order_id = NEW.order_id 
      AND (order_item_id = NEW.order_item_id OR (order_item_id IS NULL AND NEW.order_item_id IS NULL))
      AND transaction_type = NEW.transaction_type 
      AND gross_amount = NEW.gross_amount
      AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Duplicate transaction detected for order_id: %, order_item_id: %, type: %, amount: %', 
      NEW.order_id, NEW.order_item_id, NEW.transaction_type, NEW.gross_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to check duplicates on insert/update
DROP TRIGGER IF EXISTS trigger_check_transaction_duplicate ON public.transactions;
CREATE TRIGGER trigger_check_transaction_duplicate
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_transaction_duplicate();

-- Step 6: Add comment for documentation
COMMENT ON CONSTRAINT unique_transaction_per_order_item_type_amount ON public.transactions 
IS 'Prevents duplicate transactions for the same order item with same transaction type and gross amount'; 