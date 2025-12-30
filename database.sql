-- 1. Reset: Drop table if exists to start fresh
DROP TABLE IF EXISTS "public"."users";

-- 2. Create Table Structure
CREATE TABLE "public"."users" (
    "id" SERIAL PRIMARY KEY,
    "full_name" TEXT,
    "email" TEXT UNIQUE NOT NULL,
    "password_hash" TEXT,
    "wallet_address" TEXT UNIQUE,
    "role" TEXT DEFAULT 'user',
    "nonce" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Insert Data (Your specific users)
INSERT INTO "public"."users" ("id", "full_name", "email", "password_hash", "wallet_address", "role", "nonce", "created_at") VALUES 
(1, 'admin', 'admin@test.com', null, '0xdba4509eb01f6c08a0b977fa85e09ba99976cb37', 'admin', null, '2025-12-08 14:48:29.090665+00'), 
(2, 'John Wick', 'web3user1@test.com', null, '0xa3e5c03ea8473d40f81908724837b93fc56b85ed', 'admin', null, '2025-12-28 17:05:53.697586+00'), 
(4, 'Franklin Wong', 'web2user1@test.com', '$2b$10$/MnRQXj8Z.eu33dlhPwi6OBcQr85jD91Hy6/Dd2tjDjY6lYN4dhva', null, 'user', null, '2025-12-29 18:31:18.333988+00'), 
(6, 'Tony Stark', 'web3user2@test.com', null, '0x39947509f7c55f94157418fc38153612cb9dc510', 'user', null, '2025-12-29 20:18:57.338469+00'), 
(7, 'Bruce Wayne', 'Web2user2@test.com', '$2b$10$eJX8FcG7L9U9U3CzaPSveuxbYoeUwhYIZosV3Lws6bkiEjVHQwIga', null, 'user', null, '2025-12-29 22:28:20.524098+00');

-- 4. Fix Sequence (So new users get ID 8, 9, etc.)
SELECT setval(pg_get_serial_sequence('"public"."users"', 'id'), COALESCE(MAX(id), 1));