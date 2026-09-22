<?php
require_once __DIR__ . '/includes/auth.php';
session_unset();
session_destroy();
session_start();
set_flash('success', 'Anda telah keluar dari panel admin.');
redirect('admin/login.php');
