# PowerShell script to add dynamic directives to all route handlers

$routeFiles = Get-ChildItem -Path "src/app" -Filter "route.ts" -Recurse
$pageFiles = Get-ChildItem -Path "src/app" -Filter "page.tsx" -Recurse
$layoutFiles = Get-ChildItem -Path "src/app" -Filter "layout.tsx" -Recurse

$dynamicDirective = @"
// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

"@

# Process all route.ts files
foreach ($file in $routeFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    
    # Skip if the file already has a dynamic directive
    if ($content -match "export const dynamic = 'force-dynamic'") {
        Write-Host "Skipping $($file.FullName) (already has dynamic directive)"
        continue
    }
    
    # Find the first import statement
    $importMatch = [regex]::Match($content, "import .* from .*")
    
    if ($importMatch.Success) {
        $insertPos = $importMatch.Index + $importMatch.Length
        # Check if there's a newline after the import
        if ($content.Substring($insertPos, 1) -ne "`n") {
            $dynamicDirective = "`n" + $dynamicDirective
        }
        
        # Insert the dynamic directive after the import
        $newContent = $content.Substring(0, $insertPos) + "`n" + $dynamicDirective + $content.Substring($insertPos)
        Set-Content -Path $file.FullName -Value $newContent
        Write-Host "Added dynamic directive to $($file.FullName)"
    }
    else {
        # If no import, add to the beginning of the file
        $newContent = $dynamicDirective + $content
        Set-Content -Path $file.FullName -Value $newContent
        Write-Host "Added dynamic directive to beginning of $($file.FullName)"
    }
}

Write-Host "Completed adding dynamic directives to all route handlers"
