<?php
require_once __DIR__ . '/vendor/autoload.php';

use Symfony\Component\Yaml\Yaml;

$file = '/www/wwwroot/ibubble.vicp.net/Projects/Aggregator/Aggregator.yaml';

if (!file_exists($file)) {
    die("File not found: $file\n");
}

$content = file_get_contents($file);
echo "File size: " . strlen($content) . "\n";

try {
    $config = Yaml::parse($content);
    
    if (isset($config['proxies'])) {
        echo "Proxies count: " . count($config['proxies']) . "\n";
        
        // Print first 5
        /*
        foreach (array_slice($config['proxies'], 0, 5) as $i => $p) {
            echo "Proxy $i: " . ($p['name'] ?? 'No Name') . "\n";
        }
        */
        
        // Check for validity
        $valid = 0;
        foreach ($config['proxies'] as $p) {
             if (isset($p['name'], $p['type'], $p['server'], $p['port'])) {
                 $valid++;
             }
        }
        echo "Valid proxies count: $valid\n";
        
    } else {
        echo "No proxies key found.\n";
    }
    
} catch (Exception $e) {
    echo "Parse error: " . $e->getMessage() . "\n";
}
