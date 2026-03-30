<?php
declare(strict_types=1);

function loadEnvFile(string $path): array
{
    $values = [];
    if (!is_file($path)) {
        return $values;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return $values;
    }

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#')) {
            continue;
        }

        $parts = explode('=', $trimmed, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $values[trim($parts[0])] = trim($parts[1]);
    }

    return $values;
}

function h(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

$env = loadEnvFile(__DIR__ . '/../.env.local');
$dbHost = $env['DB_HOST'] ?? '127.0.0.1';
$dbPort = (int) ($env['DB_PORT'] ?? '3307');
$dbUser = $env['DB_USER'] ?? 'root';
$dbPassword = $env['DB_PASSWORD'] ?? '';
$dbName = $env['DB_NAME'] ?? 'trading_journal_temp';

$mysqli = @new mysqli($dbHost, $dbUser, $dbPassword, $dbName, $dbPort);
$connectionError = $mysqli->connect_error ?? null;
$tables = [];
$selectedTable = isset($_GET['table']) ? preg_replace('/[^a-zA-Z0-9_]/', '', (string) $_GET['table']) : '';
$tableRows = [];
$tableError = null;
$sqlMessage = null;
$sqlError = null;
$sqlResults = null;
$sqlQuery = '';

if (!$connectionError) {
    $tablesResult = $mysqli->query('SHOW TABLES');
    if ($tablesResult instanceof mysqli_result) {
        while ($row = $tablesResult->fetch_row()) {
            $tables[] = (string) $row[0];
        }
        $tablesResult->free();
    }

    if ($selectedTable !== '' && in_array($selectedTable, $tables, true)) {
        $result = $mysqli->query(sprintf('SELECT * FROM `%s` ORDER BY 1 DESC LIMIT 200', $selectedTable));
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                $tableRows[] = $row;
            }
            $result->free();
        } else {
            $tableError = $mysqli->error;
        }
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $sqlQuery = trim((string) ($_POST['sql'] ?? ''));
        if ($sqlQuery === '') {
            $sqlError = 'SQL query is required.';
        } else {
            $execResult = $mysqli->query($sqlQuery);
            if ($execResult === true) {
                $sqlMessage = 'Statement executed successfully.';
            } elseif ($execResult instanceof mysqli_result) {
                $sqlResults = [];
                while ($row = $execResult->fetch_assoc()) {
                    $sqlResults[] = $row;
                }
                $execResult->free();
                $sqlMessage = 'Query executed successfully.';
            } else {
                $sqlError = $mysqli->error;
            }
        }

        $tables = [];
        $tablesResult = $mysqli->query('SHOW TABLES');
        if ($tablesResult instanceof mysqli_result) {
            while ($row = $tablesResult->fetch_row()) {
                $tables[] = (string) $row[0];
            }
            $tablesResult->free();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trading Journal DB Admin</title>
    <style>
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #f5f7fb;
            color: #1f2937;
        }
        .layout {
            display: grid;
            grid-template-columns: 260px 1fr;
            min-height: 100vh;
        }
        .sidebar {
            background: #0f172a;
            color: #e2e8f0;
            padding: 24px 18px;
        }
        .sidebar a {
            color: #cbd5e1;
            text-decoration: none;
            display: block;
            padding: 8px 10px;
            border-radius: 8px;
            margin-bottom: 6px;
        }
        .sidebar a.active,
        .sidebar a:hover {
            background: #1e293b;
            color: #fff;
        }
        .content {
            padding: 24px;
        }
        .card {
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
            padding: 20px;
            margin-bottom: 20px;
        }
        h1, h2 {
            margin-top: 0;
        }
        .meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;
        }
        .meta div {
            background: #eef2ff;
            padding: 12px;
            border-radius: 12px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        th, td {
            border-bottom: 1px solid #e5e7eb;
            padding: 10px;
            text-align: left;
            vertical-align: top;
        }
        th {
            background: #f8fafc;
        }
        textarea {
            width: 100%;
            min-height: 140px;
            border-radius: 12px;
            border: 1px solid #cbd5e1;
            padding: 12px;
            font: inherit;
        }
        button {
            margin-top: 12px;
            background: #2563eb;
            color: #fff;
            border: 0;
            border-radius: 10px;
            padding: 10px 16px;
            cursor: pointer;
        }
        .success {
            color: #166534;
        }
        .error {
            color: #b91c1c;
        }
        .empty {
            color: #64748b;
        }
        @media (max-width: 860px) {
            .layout {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="layout">
        <aside class="sidebar">
            <h2>DB Tables</h2>
            <?php if ($connectionError): ?>
                <p class="error">Connection failed: <?= h($connectionError) ?></p>
            <?php elseif (count($tables) === 0): ?>
                <p class="empty">No tables found.</p>
            <?php else: ?>
                <?php foreach ($tables as $table): ?>
                    <a href="?table=<?= urlencode($table) ?>" class="<?= $selectedTable === $table ? 'active' : '' ?>">
                        <?= h($table) ?>
                    </a>
                <?php endforeach; ?>
            <?php endif; ?>
        </aside>
        <main class="content">
            <section class="card">
                <h1>Trading Journal DB Admin</h1>
                <div class="meta">
                    <div><strong>Host</strong><br><?= h($dbHost) ?></div>
                    <div><strong>Port</strong><br><?= h((string) $dbPort) ?></div>
                    <div><strong>User</strong><br><?= h($dbUser) ?></div>
                    <div><strong>Database</strong><br><?= h($dbName) ?></div>
                </div>
            </section>

            <section class="card">
                <h2>SQL Console</h2>
                <?php if ($sqlMessage): ?><p class="success"><?= h($sqlMessage) ?></p><?php endif; ?>
                <?php if ($sqlError): ?><p class="error"><?= h($sqlError) ?></p><?php endif; ?>
                <form method="post">
                    <textarea name="sql" placeholder="SELECT * FROM users LIMIT 20;"><?= h($sqlQuery) ?></textarea>
                    <button type="submit">Run SQL</button>
                </form>

                <?php if (is_array($sqlResults)): ?>
                    <?php if (count($sqlResults) === 0): ?>
                        <p class="empty">Query returned no rows.</p>
                    <?php else: ?>
                        <table>
                            <thead>
                                <tr>
                                    <?php foreach (array_keys($sqlResults[0]) as $column): ?>
                                        <th><?= h((string) $column) ?></th>
                                    <?php endforeach; ?>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($sqlResults as $row): ?>
                                    <tr>
                                        <?php foreach ($row as $value): ?>
                                            <td><?= h(is_scalar($value) || $value === null ? (string) $value : json_encode($value)) ?></td>
                                        <?php endforeach; ?>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php endif; ?>
                <?php endif; ?>
            </section>

            <section class="card">
                <h2>Table Browser<?= $selectedTable ? ': ' . h($selectedTable) : '' ?></h2>
                <?php if ($selectedTable === ''): ?>
                    <p class="empty">Pick a table from the left to inspect rows.</p>
                <?php elseif ($tableError): ?>
                    <p class="error"><?= h($tableError) ?></p>
                <?php elseif (count($tableRows) === 0): ?>
                    <p class="empty">No rows in this table yet.</p>
                <?php else: ?>
                    <table>
                        <thead>
                            <tr>
                                <?php foreach (array_keys($tableRows[0]) as $column): ?>
                                    <th><?= h((string) $column) ?></th>
                                <?php endforeach; ?>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($tableRows as $row): ?>
                                <tr>
                                    <?php foreach ($row as $value): ?>
                                        <td><?= h(is_scalar($value) || $value === null ? (string) $value : json_encode($value)) ?></td>
                                    <?php endforeach; ?>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </section>
        </main>
    </div>
</body>
</html>
