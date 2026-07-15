# Supabase Storage Upload Action

Context for a reusable GitHub Action that transfers files from a workflow workspace to Supabase Storage.

## Language

**Supabase Storage Upload Action**:
The reusable GitHub Action published by this repository. A Consumer Workflow invokes one Action.
_Avoid_: uploader, deploy action

**Consumer Workflow**:
A GitHub Actions workflow that invokes the Supabase Storage Upload Action.
_Avoid_: client, consumer

**Upload Item**:
One declared local source and routing rules that can expand into one or more objects in a Supabase Storage bucket. A Consumer Workflow can declare many Upload Items.
_Avoid_: file mapping, upload job

**Object Key**:
The normalized, relative path that identifies an object inside a Supabase Storage bucket.
_Avoid_: output path, remote filename

## Example dialogue

Developer: "This Consumer Workflow invokes the Supabase Storage Upload Action for two Upload Items."

Domain expert: "Each Upload Item expands its source into Object Keys in a bucket."
