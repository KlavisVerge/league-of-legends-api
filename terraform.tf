terraform {
  backend "local" {
    path = "tf_backend/league-of-legends-api.tfstate"
  }
}

variable "REST_API_ID" {}
variable "PARENT_ID" {}
variable "AWS_ACCESS_KEY" {}
variable "AWS_SECRET_ACCESS_KEY" {}
variable "FORTNITE_TRN_API_KEY" {}

data "aws_iam_role" "role" {
  name = "apis-for-all-service-account"
}

provider "aws" {
  region     = "us-east-1"
  access_key = "${var.AWS_ACCESS_KEY}"
  secret_key = "${var.AWS_SECRET_ACCESS_KEY}"
}

resource "aws_api_gateway_resource" "league-of-legends-api-resource" {
  rest_api_id = "${var.REST_API_ID}"
  parent_id   = "${var.PARENT_ID}"
  path_part   = "league-of-legends-api"
}

resource "aws_lambda_function" "league-of-legends-api-function" {
  filename      = "league-of-legends-api.zip"
  function_name = "league-of-legends-api"

  role             = "${data.aws_iam_role.role.arn}"
  handler          = "src/league-of-legends-api.handler"
  source_code_hash = "${base64sha256(file("league-of-legends-api.zip"))}"
  runtime          = "nodejs6.10"
  timeout          = 20

  environment {
    variables {
      league-of-legends_TRY_API_KEY = "${var.FORTNITE_TRN_API_KEY}"
    }
  }
}

resource "aws_lambda_permission" "league-of-legends-permission" {
  function_name = "${aws_lambda_function.league-of-legends-api-function.function_name}"
  statement_id  = "AllowExecutionFromApiGateway"
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
}

resource "aws_api_gateway_method" "league-of-legends-api-method-post" {
  rest_api_id   = "${var.REST_API_ID}"
  resource_id   = "${aws_api_gateway_resource.league-of-legends-api-resource.id}"
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "league-of-legends-api-integration" {
  rest_api_id             = "${var.REST_API_ID}"
  resource_id             = "${aws_api_gateway_resource.league-of-legends-api-resource.id}"
  http_method             = "POST"
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "${aws_lambda_function.league-of-legends-api-function.invoke_arn}"
}

module "CORS_FUNCTION_DETAILS" {
  source      = "github.com/carrot/terraform-api-gateway-cors-module"
  resource_id = "${aws_api_gateway_resource.league-of-legends-api-resource.id}"
  rest_api_id = "${var.REST_API_ID}"
}
