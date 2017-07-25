port module Main exposing (..)

import HtmlToString exposing (htmlToString)
import Html exposing (Html, h1, div, text)
import Platform exposing (program)
import Dict exposing (Dict)
import Json.Encode
import OtherView
import UsersView


-- Ports


port getView : (GetViewRequest -> msg) -> Sub msg


port receiveHtml : GetHtmlResult -> Cmd msg



-- Model


type Msg
    = GetView GetViewRequest
    | NoOp


type alias Context =
    Json.Encode.Value


type alias GetViewRequest =
    { viewName : String, context : Context, id : Maybe Int }


type alias GetHtmlResult =
    { error : Maybe String, html : Maybe String, id : Maybe Int }


type alias Model =
    Dict String (Context -> Result String (Html Msg))


init : ( Model, Cmd msg )
init =
    ( [ OtherView.view
      , UsersView.view
      ]
    , Cmd.none
    )



-- Update


update : Msg -> Model -> ( Model, Cmd msg )
update msg model =
    case msg of
        GetView request ->
            ( model
            , request.id
                |> getViewHtml model request.context request.viewName
                |> receiveHtml
            )

        NoOp ->
            model ! []


getViewHtml : Model -> Context -> String -> (Maybe Int -> GetHtmlResult)
getViewHtml views context name =
    let
        view =
            Dict.get name views
    in
        view
            |> Maybe.map (renderView context)
            |> Maybe.withDefault (GetHtmlResult (Just "View was not found") Nothing)


renderView : Context -> (Context -> Result String (Html Msg)) -> (Maybe Int -> GetHtmlResult)
renderView context view =
    case view context of
        Ok view ->
            view
                |> htmlToString
                |> Just
                |> GetHtmlResult Nothing

        Err error ->
            GetHtmlResult (Just "Invalid context for this view") Nothing



-- Program


main : Program Never Model Msg
main =
    program
        { init = init
        , update = update
        , subscriptions = \_ -> getView GetView
        }