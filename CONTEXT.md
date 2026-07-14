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
One declared local source and its intended object destination in a Supabase Storage bucket. A Consumer Workflow can declare many Upload Items.
_Avoid_: file mapping, upload job

## Example dialogue

Developer: "This Consumer Workflow invokes the Supabase Storage Upload Action for two Upload Items."

Domain expert: "Each Upload Item identifies one source and one destination in a bucket."
