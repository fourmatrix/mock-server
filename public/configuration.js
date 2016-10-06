(function(){
	"use strict";

	$(function(){
		$("#server-submit").on("click", function(e){
			var val = $("#server-form").serialize();

			$.post(
				'/__server_config__/save_server_config',
				val,
				function(data){

					console.log(data);

				}
			);
		});

		$("#service-submit").on("click", function(e){
			var serviceUrl = $("#service-url").val();
			var serviceData = $("#service-data").val();
			var serviceMethod = $("#service-method").val();
			var serviceParam = $("#service-param").val();

			if(serviceUrl.length === 0 ||serviceMethod.length === 0 ){
				return false;
			}

			$.post(
				'/__server_config__/save_service_config',
				{
					serviceUrl: serviceUrl,
					serviceData:serviceData,
					serviceMethod:serviceMethod,
					serviceParam:serviceParam

				},
				function(data){
					if(data && data !=="no_change"){
						var newService = true;
						$("td.service-url").each((inx,ele)=>{
							if($(ele).text()===data.url){
								return newService = false;
							}
						});

						if(newService){
							var serviceTd = $("<td class='service-url'>").text(data.url);
							var actionTd = $('<td><a class="edit">edit</a><a class="delete">delete</a></td>');
							var paramTd = $("<td>");
							var methodTd = $("<td>");
							$("table").append($("<tr>").append(serviceTd).append(methodTd).append(paramTd).append(actionTd));
						}
					}
				}
			);
		});

		$("table").on("click",".delete", function(e){

			var $targetTd = $(e.currentTarget).parent();
			var url = $targetTd.siblings(".service-url").text().trim();
			$.post("/__server_config__/delete_service_config", {data: url}, function(data){
				if(data && data.url){
					$targetTd.parent().remove();
				}			
			});
		});


		$("table").on("click",".edit", function(e){
			var $targetTd = $(e.currentTarget).parent();
			var url = $targetTd.siblings(".service-url").text().trim();
			$.get("/__server_config__/load_service?data=" + url, function(data){
				if(data && data.url){
					$targetTd.parent().remove();
				}			
			});
		});
	});

})();
