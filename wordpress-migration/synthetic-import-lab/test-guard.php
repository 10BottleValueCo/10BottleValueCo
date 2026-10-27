<?php
require '/wordpress/wp-load.php'; require '/wordpress/wp-content/plugins/tbv-synthetic-migration/tbv-synthetic-migration.php';
$x=['synthetic'=>true,'customers'=>[],'orders'=>[]];$a=tbvsm_plan($x);$b=tbvsm_apply($x);$c=['plan_refused'=>is_wp_error($a)&&$a->get_error_code()==='test_runtime_required','apply_refused'=>is_wp_error($b)&&$b->get_error_code()==='test_runtime_required','no_lock_created'=>get_option('_tbvsm_lab_lock')===false];echo wp_json_encode(['passed'=>count(array_filter($c)),'total'=>count($c),'checks'=>$c]);
