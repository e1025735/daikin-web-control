<?php
require "engine.php";
require_once __DIR__ . '/timer_store.php';

if($_SERVER["REQUEST_METHOD"] == "POST"){
	$aRequest = json_decode(file_get_contents('php://input'), true);
   	$json_ret = set_array_info("/aircon/set_control_info",$_GET["unit_ip"],$aRequest);
   	//request failed
   	if($json_ret===FALSE){
   		//print("ret":"FAIL","adv":"");
	   	http_response_code(503); //service Unavailable
    	exit;
   }
	print($json_ret);

}else if($_SERVER["REQUEST_METHOD"] == "GET"){
	//control if uri is sended
	if( (! isset($_GET["uri"])) || (
		$_GET["uri"] != "/aircon/get_sensor_info" &&
		$_GET["uri"] != "/aircon/get_control_info"
		)){
		http_response_code(405); //method not allowed
		exit;
	}

	$json_info=get_json_info($_GET["uri"],$_GET["unit_ip"]);
	//request failed
	if($json_info===FALSE){
		http_response_code(503); //service Unavailable
		exit;
	}
	// Cache the most recent control snapshot per unit so the timer worker
	// has a fallback payload if a stored timer's payload ever gets lost.
	if ($_GET["uri"] === "/aircon/get_control_info") {
		last_control_cache_write($_GET["unit_ip"], $json_info);
	}
	print($json_info);
}
?>
