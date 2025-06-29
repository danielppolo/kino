# Bulk Category Change Feature for Tags

## Overview
This feature allows users to convert a tag to a category by bulk changing the category of all transactions associated with that tag. It provides a user-friendly interface through an AlertDialog that shows the number of affected transactions, allows selection of a new category, and automatically deletes the tag after the conversion.

## Implementation Details

### Files Modified/Created:

1. **`utils/supabase/mutations.ts`**
   - Added `updateTransactionCategoriesByTag()` function
   - Fetches all transaction IDs associated with a tag via the `transaction_tags` junction table
   - Updates all transactions with the new category ID
   - Returns the count of updated transactions

2. **`app/app/settings/tags/(components)/bulk-category-change-dialog.tsx`** (NEW)
   - React component that provides the UI for tag-to-category conversion
   - Uses `AlertDialog` for confirmation and warning about irreversible action
   - Integrates `CategoryCombobox` for category selection
   - Shows transaction count in the description
   - Automatically deletes the tag after successful category conversion
   - Handles loading states and error handling
   - Invalidates relevant queries after successful update

3. **`app/app/settings/tags/(components)/tags-section.tsx`** (MODIFIED)
   - Added "Change Category" button for each tag row
   - Button only appears when tag has associated transactions
   - Integrates the bulk category change dialog
   - Manages dialog state and passes required props

### Key Features:

- **Transaction Count Display**: Shows the exact number of transactions that will be affected
- **Category Selection**: Uses the existing `CategoryCombobox` component for consistent UX
- **Automatic Tag Deletion**: Tag is automatically deleted after successful category conversion
- **AlertDialog Confirmation**: Uses AlertDialog to warn about irreversible action
- **Error Handling**: Provides user feedback for success/failure states
- **Query Invalidation**: Automatically refreshes related data after updates
- **Loading States**: Shows loading indicators during the conversion process

### User Flow:

1. User navigates to Settings > Tags
2. For tags with associated transactions, a "Change Category" button appears
3. Clicking the button opens an AlertDialog showing:
   - Warning about irreversible action
   - Tag name and number of affected transactions
   - Category selection dropdown
4. User selects a new category and confirms the conversion
5. System updates all associated transactions with the new category
6. Tag is automatically deleted after successful transaction updates
7. Success message shows the number of converted transactions
8. UI refreshes to reflect changes

### Database Operations:

- Uses the `transaction_tags` junction table to find all transactions for a tag
- Updates the `category_id` field for all matching transactions
- Automatically deletes the tag from the `tags` table
- Maintains referential integrity through foreign key constraints

### Error Handling:

- Validates that a category is selected before proceeding
- Handles database errors gracefully
- Shows appropriate error messages to users
- Prevents multiple simultaneous operations
- Ensures tag deletion only occurs after successful transaction updates

## Usage

The feature is automatically available in the tags settings page. Users can:

1. Go to `/app/settings/tags`
2. Find a tag with associated transactions
3. Click the "Change Category" button
4. Select a new category from the dropdown
5. Confirm the conversion in the AlertDialog

The feature respects existing permissions and follows the same patterns as other bulk operations in the application.

### Tag Conversion Behavior:

- The tag is automatically deleted after all transactions are converted to the new category
- This is useful for converting temporary tags into proper categories
- The conversion is irreversible, so users are warned in the AlertDialog
- The tag deletion only occurs if the transaction updates are successful
- The button text "Convert to Category" clearly indicates the intended action 