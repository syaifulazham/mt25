# PowerShell script to add 'export const dynamic = 'force-dynamic';' to all route.ts files

$routeFiles = Get-ChildItem -Path ".\src\app" -Filter "route.ts" -Recurse -File

foreach ($file in $routeFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    
    # Check if the file already has the directive
    if (-not ($content -match "export const dynamic = 'force-dynamic'")) {
        # Find a good spot to insert the line (after imports but before code)
        if ($content -match "import[\s\S]*?;(\r?\n)+") {
            $lastImportIndex = $matches[0].Length
            $newContent = $content.Substring(0, $lastImportIndex) + 
                          "export const dynamic = 'force-dynamic';" + 
                          [Environment]::NewLine + 
                          $content.Substring($lastImportIndex)
            
            # Write the modified content back to the file
            Set-Content -Path $file.FullName -Value $newContent -NoNewline
            Write-Host "Added dynamic directive to $($file.FullName)"
        }
        else {
            # If we can't find a good spot after imports, just add it at the beginning
            $newContent = "export const dynamic = 'force-dynamic';" + 
                          [Environment]::NewLine + 
                          $content
                          
            Set-Content -Path $file.FullName -Value $newContent -NoNewline
            Write-Host "Added dynamic directive to beginning of $($file.FullName)"
        }
    }
    else {
        Write-Host "File already has dynamic directive: $($file.FullName)"
    }
}

Write-Host "Finished processing all route.ts files"
