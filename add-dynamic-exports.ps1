## PowerShell script to add dynamic exports to all route.ts files
$routeFiles = Get-ChildItem -Path "src\app\api" -Filter "route.ts" -Recurse

foreach ($file in $routeFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    
    # Skip if file already has dynamic export
    if ($content -match "export const dynamic = 'force-dynamic'") {
        Write-Host "Skipping $($file.FullName) - already has dynamic export"
        continue
    }
    
    # Find import statements
    $lines = $content -split "`n"
    $lastImportLine = -1
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^import ") {
            $lastImportLine = $i
        } elseif ($lines[$i] -match "^export") {
            break
        }
    }
    
    # Insert dynamic exports after the last import line
    $dynamicExport = @"

// Mark this route as dynamic since it uses server-only features
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
"@
    
    if ($lastImportLine -ge 0) {
        $lines = $lines[0..$lastImportLine] + $dynamicExport + $lines[($lastImportLine+1)..($lines.Count-1)]
        $newContent = $lines -join "`n"
        
        # Write the updated content back to the file
        Set-Content -Path $file.FullName -Value $newContent
        Write-Host "Added dynamic exports to $($file.FullName)"
    } else {
        Write-Host "Could not find import statements in $($file.FullName)"
    }
}

Write-Host "Completed processing API route files"
